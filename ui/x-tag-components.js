
if (!(document.register || {}).__polyfill__){

  (function(){
    
    var win = window,
      doc = document,
      tags = {},
      tokens = [],
      domready = false,
      mutation = win.MutationObserver || win.WebKitMutationObserver ||  win.MozMutationObserver,
      _createElement = doc.createElement,
      register = function(name, options){
        if (!tags[name]) tokens.push(name);
        options = options || {};
        if (options.prototype && !('setAttribute' in options.prototype)) {
          throw new TypeError("Unexpected prototype for " + name + " element - custom element prototypes must inherit from the Element interface");
        }
        var _prototype = options.prototype || Object.create((win.HTMLSpanElement || win.HTMLElement).prototype),
            lifecycle = options.lifecycle || {},
            tag = tags[name] = {
              'constructor': function(){
                return doc.createElement(name);
              },
              _prototype: doc.__proto__ ? null : unwrapPrototype(_prototype),
              'prototype': _prototype,
              'fragment': options.fragment || doc.createDocumentFragment(),
              'lifecycle': {
                created: lifecycle.created || function(){},
                removed: lifecycle.removed || function(){},
                inserted: lifecycle.inserted || function(){},
                attributeChanged: lifecycle.attributeChanged || function(){}
              }
            };
        tag.constructor.prototype = tag.prototype;
        if (domready) query(doc, name).forEach(function(element){
          upgrade(element, true);
        });
        return tag.constructor;
      };
    
    function unwrapPrototype(proto){
      var definition = {},
          names = Object.getOwnPropertyNames(proto),
          index = names.length;
      if (index) while (index--) {
        definition[names[index]] = Object.getOwnPropertyDescriptor(proto, names[index]);
      }
      return definition;
    }
    
    function typeOf(obj) {
      return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
    }
    
    function clone(item, type){
      var fn = clone[type || typeOf(item)];
      return fn ? fn(item) : item;
    }
      clone.object = function(src){
        var obj = {};
        for (var key in src) obj[key] = clone(src[key]);
        return obj;
      };
      clone.array = function(src){
        var i = src.length, array = new Array(i);
        while (i--) array[i] = clone(src[i]);
        return array;
      };
    
    var unsliceable = ['number', 'boolean', 'string', 'function'];
    function toArray(obj){
      return unsliceable.indexOf(typeof obj) == -1 ? 
      Array.prototype.slice.call(obj, 0) :
      [obj];
    }
    
    function query(element, selector){
      return element && selector && selector.length ? toArray(element.querySelectorAll(selector)) : [];
    }
    
    function getTag(element){
      return element.nodeName ? tags[element.nodeName.toLowerCase()] : false;
    }
    
    function manipulate(element, fn){
      var next = element.nextSibling,
        parent = element.parentNode,
        frag = doc.createDocumentFragment(),
        returned = fn.call(frag.appendChild(element), frag) || element;
      if (next){
        parent.insertBefore(returned, next);
      }
      else{
        parent.appendChild(returned);
      }
    }
    
    function upgrade(element, replace){
      if (!element._elementupgraded && !element._suppressObservers) {
        var tag = getTag(element);
        if (tag) {
          var upgraded = element;
          if (replace) {
            element._suppressObservers = true;
            manipulate(element, function(){
              upgraded = _createElement.call(doc, element.nodeName);
              upgraded._suppressObservers = true;
              while (element.firstChild) upgraded.appendChild(element.firstChild);
              var index = element.attributes.length;
              while (index--) {
                var attr = element.attributes[index];
                _setAttribute.call(upgraded, attr.name, attr.value);
              }
              return upgraded;
            });
          }
          if (doc.__proto__) upgraded.__proto__ = tag.prototype;
          else Object.defineProperties(upgraded, tag._prototype);
          upgraded.constructor = tag.constructor;
          upgraded._elementupgraded = true;
          if (!mutation) delete upgraded._suppressObservers;
          tag.lifecycle.created.call(upgraded, tag.prototype);
          if (replace) fireEvent(element, 'elementreplace', { upgrade: upgraded }, { bubbles: false });
          fireEvent(upgraded, 'elementupgrade');
        }
      }
    }
    
    function inserted(element, event){
      var tag = getTag(element);
      if (tag){
        if (!element._elementupgraded) upgrade(element, true);
        else {
          if (element._suppressObservers) {
            delete element._suppressObservers;
            return element;
          }
          if (!element._suppressObservers && doc.documentElement.contains(element)) {
            tag.lifecycle.inserted.call(element);
          }
          insertChildren(element);
        }
      }
      else insertChildren(element);
    }

    function insertChildren(element){
      if (element.childNodes.length) query(element, tokens).forEach(function(el){
        if (!el._elementupgraded) upgrade(el, true);
        getTag(el).lifecycle.inserted.call(el);
      });
    }
    
    function removed(element){
      if (element._elementupgraded) {
        if (element._suppressObservers) delete element._suppressObservers;
        else {
          getTag(element).lifecycle.removed.call(element);
          if (element.childNodes.length) query(element, tokens).forEach(function(el){
            removed(el);
          });
        }
      }
    }
    
    function addObserver(element, type, fn){
      if (!element._records) {
        element._records = { inserted: [], removed: [] };
        if (mutation){
          element._observer = new mutation(function(mutations) {
            parseMutations(element, mutations);
          });
          element._observer.observe(element, {
            subtree: true,
            childList: true,
            attributes: !true,
            characterData: false
          });
        }
        else ['Inserted', 'Removed'].forEach(function(type){
          element.addEventListener('DOMNode' + type, function(event){
            event._mutation = true;
            element._records[type.toLowerCase()].forEach(function(fn){
              fn(event.target, event);
            });
          }, false);
        });
      }
      if (element._records[type].indexOf(fn) == -1) element._records[type].push(fn);
    }
    
    function removeObserver(element, type, fn){
      var obj = element._records;
      if (obj && fn){
        obj[type].splice(obj[type].indexOf(fn), 1);
      }
      else{
        obj[type] = [];
      }
    }
      
    function parseMutations(element, mutations) {
      var diff = { added: [], removed: [] };
      mutations.forEach(function(record){
        record._mutation = true;
        for (var z in diff) {
          var type = element._records[(z == 'added') ? 'inserted' : 'removed'],
            nodes = record[z + 'Nodes'], length = nodes.length;
          for (var i = 0; i < length && diff[z].indexOf(nodes[i]) == -1; i++){
            diff[z].push(nodes[i]);
            type.forEach(function(fn){
              fn(nodes[i], record);
            });
          }
        }
      });
    }
      
    function fireEvent(element, type, data, options){
      options = options || {};
      var event = doc.createEvent('Event');
      event.initEvent(type, 'bubbles' in options ? options.bubbles : true, 'cancelable' in options ? options.cancelable : true);
      for (var z in data) event[z] = data[z];
      element.dispatchEvent(event);
    }

    var polyfill = !doc.register;
    if (polyfill) {
      doc.register = register;
      
      doc.createElement = function createElement(tag){
        var element = _createElement.call(doc, tag);
        upgrade(element);
        return element;
      };
      
      var _setAttribute = Element.prototype.setAttribute;   
      Element.prototype.setAttribute = function(attr, value, skip){
        var tag = getTag(this),
            last = this.getAttribute(attr);
        _setAttribute.call(this, attr, value);
        if (tag && last != this.getAttribute(attr)) {
          tag.lifecycle.attributeChanged.call(this, attr, value, last, skip);
        } 
      };
      
      var initialize = function (){
        addObserver(doc.documentElement, 'inserted', inserted);
        addObserver(doc.documentElement, 'removed', removed);
        
        if (tokens.length) query(doc, tokens).forEach(function(element){
          upgrade(element, true);
        });
        
        domready = true;
        fireEvent(doc, 'DOMComponentsLoaded');
        fireEvent(doc, '__DOMComponentsLoaded__');
      };
      
      if (doc.readyState == 'complete') initialize();
      else doc.addEventListener(doc.readyState == 'interactive' ? 'readystatechange' : 'DOMContentLoaded', initialize); 
    }
    
    doc.register.__polyfill__ = {
      query: query,
      clone: clone,
      typeOf: typeOf,
      toArray: toArray,
      fireEvent: fireEvent,
      manipulate: manipulate,
      addObserver: addObserver,
      removeObserver: removeObserver,
      observerElement: doc.documentElement,
      parseMutations: parseMutations,
      _inserted: inserted,
      _createElement: _createElement,
      _polyfilled: polyfill
    };

  })();

}

(function () {

/*** Internal Variables ***/

  var win = window,
    doc = document,
    regexPseudoSplit = /(\w+(?:\([^\)]+\))?)/g,
    regexPseudoReplace = /(\w*)(?:\(([^\)]*)\))?/,
    regexDigits = /(\d+)/g,
    keypseudo = {
      action: function (pseudo, event) {
        return pseudo.value.match(regexDigits).indexOf(String(event.keyCode)) > -1 == (pseudo.name == 'keypass');
      }
    },
    touchFilter = function (custom, event) {
      if (custom.listener.touched) return custom.listener.touched = false;
      else {
        if (event.type.match('touch')) custom.listener.touched = true;
      }
    },
    createFlowEvent = function (type) {
      var flow = type == 'over';
      return {
        base: 'OverflowEvent' in win ? 'overflowchanged' : type + 'flow',
        condition: function (custom, event) {
          event.flow = type;
          return event.type == (type + 'flow') ||
          ((event.orient === 0 && event.horizontalOverflow == flow) ||
          (event.orient == 1 && event.verticalOverflow == flow) ||
          (event.orient == 2 && event.horizontalOverflow == flow && event.verticalOverflow == flow));
        }
      };
    },
    prefix = (function () {
      var styles = win.getComputedStyle(doc.documentElement, ''),
          pre = (Array.prototype.slice
            .call(styles)
            .join('')
            .match(/-(moz|webkit|ms)-/) || (styles.OLink === '' && ['', 'o'])
          )[1];
      return {
        dom: pre == 'ms' ? pre.toUpperCase() : pre,
        lowercase: pre,
        css: '-' + pre + '-',
        js: pre[0].toUpperCase() + pre.substr(1)
      };

    })(),
    matchSelector = Element.prototype.matchesSelector || Element.prototype[prefix.lowercase + 'MatchesSelector'];

/*** Internal Functions ***/

  // Mixins

  function mergeOne(source, key, current){
    var type = xtag.typeOf(current);
    if (type == 'object' && xtag.typeOf(source[key]) == 'object') xtag.merge(source[key], current);
    else source[key] = xtag.clone(current, type);
    return source;
  }

  function mergeMixin(type, mixin, option) {
    var original = {};
    for (var o in option) original[o.split(':')[0]] = true;
    for (var x in mixin) if (!original[x.split(':')[0]]) option[x] = mixin[x];
  }

  function applyMixins(tag) {
    tag.mixins.forEach(function (name) {
      var mixin = xtag.mixins[name];
      for (var type in mixin) {
        switch (type) {
          case 'lifecycle': case 'methods':
            mergeMixin(type, mixin[type], tag[type]);
            break;
          case 'accessors': case 'prototype':
            for (var z in mixin[type]) mergeMixin(z, mixin[type], tag.accessors);
            break;
          case 'events':
            break;
        }
      }
    });
    return tag;
  }

  function attachProperties(tag, prop, z, accessor, attr, setter){
    var key = z.split(':'), type = key[0];
    if (type == 'get') {
      key[0] = prop;
      tag.prototype[prop].get = xtag.applyPseudos(key.join(':'), accessor[z], tag.pseudos);
    }
    else if (type == 'set') {
      key[0] = prop;
      tag.prototype[prop].set = xtag.applyPseudos(key.join(':'), attr ? function(value){
        setter.call(this, value);
        accessor[z].call(this, value);
      } : accessor[z], tag.pseudos);
    }
    else tag.prototype[prop][z] = accessor[z];
  }
  
  function parseAccessor(tag, prop){
    tag.prototype[prop] = {};
    var accessor = tag.accessors[prop],
        attr = accessor.attribute,
        name = attr && attr.name ? attr.name.toLowerCase() : prop;

    if (attr) {
      tag.attributes[name] = attr;
      tag.attributes[name].setter = prop;
      var setter = function(value){
        var node = this.xtag.attributeNodes[name];
        if (!node || (node != this && !node.parentNode)) {
          node = this.xtag.attributeNodes[name] = attr.property ? this.xtag[attr.property] : attr.selector ? this.querySelector(attr.selector) : this;
        }
        var val = attr.boolean ? '' : value,
            method = (attr.boolean && (value === false || value == null)) ? 'removeAttribute' : value === null ? 'removeAttribute' : 'setAttribute';
        if (value != (attr.boolean ? this.hasAttribute(name) : this.getAttribute(name))) this[method](name, val);
        if (node && node != this && (value != (attr.boolean ? node.hasAttribute(name) : node.getAttribute(name)))) node[method](name, val);
      };
    }
    
    for (var z in accessor) attachProperties(tag, prop, z, accessor, attr, setter);

    if (attr) {
      if (!tag.prototype[prop].get) {
        var method = (attr.boolean ? 'has' : 'get') + 'Attribute';
        tag.prototype[prop].get = function(){
          return this[method](name);
        };
      }
      if (!tag.prototype[prop].set) tag.prototype[prop].set = setter;
    }

  }

/*** X-Tag Object Definition ***/

  var xtag = {
    tags: {},
    defaultOptions: {
      pseudos: [],
      mixins: [],
      events: {},
      methods: {},
      accessors: {},
      lifecycle: {},
      attributes: {},
      'prototype': {
        xtag: {
          get: function(){
            return this.__xtag__ ? this.__xtag__ : (this.__xtag__ = { data: {}, attributeNodes: {} });
          }
        }
      }
    },
    register: function (name, options) {
      var _name = name.toLowerCase();
      var tag = xtag.tags[_name] = applyMixins(xtag.merge({}, xtag.defaultOptions, options));

      for (var z in tag.events) tag.events[z] = xtag.parseEvent(z, tag.events[z]);
      for (var z in tag.lifecycle) tag.lifecycle[z.split(':')[0]] = xtag.applyPseudos(z, tag.lifecycle[z], tag.pseudos);
      for (var z in tag.methods) tag.prototype[z.split(':')[0]] = { value: xtag.applyPseudos(z, tag.methods[z], tag.pseudos) };
      for (var prop in tag.accessors) parseAccessor(tag, prop);

      var attributeChanged = tag.lifecycle.attributeChanged;
      tag.prototype.attributeChangedCallback = {
        value: function(name, last){
          var attr = tag.attributes[name.toLowerCase()] || {};
          if (attr.setter) this[attr.setter] = attr.boolean ? this.hasAttribute(name) : this.getAttribute(name);
          return attributeChanged ? attributeChanged.call(this, name, last) : null;
        }
      };

      var ready = tag.lifecycle.created || tag.lifecycle.ready;
      tag.prototype.readyCallback = {
        value: function(){
          var element = this;
          xtag.addEvents(this, tag.events);
          tag.mixins.forEach(function(mixin){
            if (xtag.mixins[mixin].events) xtag.addEvents(element, xtag.mixins[mixin].events);
          });
          var output = ready ? ready.apply(this, xtag.toArray(arguments)) : null;
          for (var attr in tag.attributes) if (this.hasAttribute(attr)) {
            this[tag.attributes[attr].setter] = tag.attributes[attr].boolean ? this.hasAttribute(attr) : this.getAttribute(attr);
          }
          tag.pseudos.forEach(function(obj){
            obj.onAdd.call(element, obj);
          });
          return output;
        }
      };

      if (tag.lifecycle.inserted) tag.prototype.insertedCallback = { value: tag.lifecycle.inserted };
      if (tag.lifecycle.removed) tag.prototype.removedCallback = { value: tag.lifecycle.removed };

      var constructor = doc.register(_name, {
        'extends': options.extends,
        'prototype': Object.create((options.extends ? document.createElement(options.extends).constructor : win.HTMLElement).prototype, tag.prototype)
      });

      return constructor;
    },

  /*** Exposed Variables ***/
    mixins: {},
    prefix: prefix,
    captureEvents: ['focus', 'blur'],
    customEvents: {
      overflow: createFlowEvent('over'),
      underflow: createFlowEvent('under'),
      animationstart: {
        base: [
          'animationstart',
          'oAnimationStart',
          'MSAnimationStart',
          'webkitAnimationStart'
        ]
      },
      transitionend: {
        base: [
          'transitionend',
          'oTransitionEnd',
          'MSTransitionEnd',
          'webkitTransitionEnd'
        ]
      },
      tap: {
        base: ['click', 'touchend'],
        condition: touchFilter
      },
      tapstart: {
        base: ['mousedown', 'touchstart'],
        condition: touchFilter
      },
      tapend: {
        base: ['mouseup', 'touchend'],
        condition: touchFilter
      },
      tapenter: {
        base: ['mouseover', 'touchenter'],
        condition: touchFilter
      },
      tapleave: {
        base: ['mouseout', 'touchleave'],
        condition: touchFilter
      },
      tapmove: {
        base: ['mousemove', 'touchmove'],
        condition: touchFilter
      }
    },
    pseudos: {
      keypass: keypseudo,
      keyfail: keypseudo,
      delegate: {
        action: function (pseudo, event) {
          var target = xtag.query(this, pseudo.value).filter(function (node) {
            return node == event.target || node.contains ? node.contains(event.target) : false;
          })[0];
          return target ? pseudo.listener = pseudo.listener.bind(target) : false;
        }
      },
      preventable: {
        action: function (pseudo, event) {
          return !event.defaultPrevented;
        }
      }
    },

  /*** Utilities ***/

    // JS Types

    wrap: function (original, fn) {
      return function () {
        var args = xtag.toArray(arguments),
          returned = original.apply(this, args);
        return returned === false ? false : fn.apply(this, typeof returned != 'undefined' ? xtag.toArray(returned) : args);
      };
    },

    merge: function(source, k, v){
      if (xtag.typeOf(k) == 'string') return mergeOne(source, k, v);
      for (var i = 1, l = arguments.length; i < l; i++){
        var object = arguments[i];
        for (var key in object) mergeOne(source, key, object[key]);
      }
      return source;
    },

    skipTransition: function(element, fn, bind){
      var duration = prefix.js + 'TransitionDuration';
      element.style[duration] = '0.001s';
      fn.call(bind);
      xtag.addEvent(element, 'transitionend', function(){
        element.style[duration] = '';
      });
    },

    requestFrame: (function(){
      var raf = win.requestAnimationFrame ||
        win[prefix.lowercase + 'RequestAnimationFrame'] ||
        function(fn){ return win.setTimeout(fn, 20) };
      return function(fn){
        return raf.call(win, fn);
      }
    })(),

    matchSelector: function (element, selector) {
      return matchSelector.call(element, selector);
    },

    set: function (element, method, value) {
      element[method] = value;
      if (xtag._polyfilled) {
        if (xtag.observerElement._observer) {
          xtag._parseMutations(xtag.observerElement, xtag.observerElement._observer.takeRecords());
        }
        else xtag._insertChildren(element);
      }
    },

    innerHTML: function(el, html){
      xtag.set(el, 'innerHTML', html);
    },

    hasClass: function (element, klass) {
      return element.className.split(' ').indexOf(klass.trim())>-1;
    },

    addClass: function (element, klass) {
      var list = element.className.trim().split(' ');
      klass.trim().split(' ').forEach(function (name) {
        if (!~list.indexOf(name)) list.push(name);
      });
      element.className = list.join(' ').trim();
      return element;
    },

    removeClass: function (element, klass) {
      var classes = klass.trim().split(' ');
      element.className = element.className.trim().split(' ').filter(function (name) {
        return name && !~classes.indexOf(name);
      }).join(' ');
      return element;
    },

    toggleClass: function (element, klass) {
      return xtag[xtag.hasClass(element, klass) ? 'removeClass' : 'addClass'].call(null, element, klass);

    },

    query: function (element, selector) {
      return xtag.toArray(element.querySelectorAll(selector));
    },

    queryChildren: function (element, selector) {
      var id = element.id,
        guid = element.id = id || 'x_' + new Date().getTime(),
        attr = '#' + guid + ' > ';
      selector = attr + (selector + '').replace(',', ',' + attr, 'g');
      var result = element.parentNode.querySelectorAll(selector);
      if (!id) element.removeAttribute('id');
      return xtag.toArray(result);
    },

    createFragment: function (content) {
      var frag = doc.createDocumentFragment();
      if (content) {
        var div = frag.appendChild(doc.createElement('div')),
          nodes = xtag.toArray(content.nodeName ? arguments : !(div.innerHTML = content) || div.children),
          index = nodes.length;
        while (index--) frag.insertBefore(nodes[index], div);
        frag.removeChild(div);
      }
      return frag;
    },

  /*** Pseudos ***/

    applyPseudos: function(key, fn, element) {
      var listener = fn,
          pseudos = {};
      if (key.match(':')) {
        var split = key.match(regexPseudoSplit),
            i = split.length;
        while (--i) {
          split[i].replace(regexPseudoReplace, function (match, name, value) {
            var pseudo = pseudos[i] = Object.create(xtag.pseudos[name]);
                pseudo.key = key;
                pseudo.name = name;
                pseudo.value = value;
            if (!pseudo) throw "pseudo not found: " + name;
            var last = listener;
            listener = function(){
              var args = xtag.toArray(arguments),
                  obj = {
                    key: key,
                    name: name,
                    value: value,
                    listener: last
                  };
              if (pseudo.action && pseudo.action.apply(this, [obj].concat(args)) === false) return false;
              return obj.listener.apply(this, args);
            };
            if (element && pseudo.onAdd) {
              element.getAttribute ? pseudo.onAdd.call(element, pseudo) : element.push(pseudo);
            }
          });
        }
      }
      for (var z in pseudos) {
        if (pseudos[z].onCompiled) listener = pseudos[z].onCompiled(listener, pseudos[z]);
      }
      return listener;
    },

  /*** Events ***/

    parseEvent: function(type, fn) {
      var pseudos = type.split(':'),
        noop = function(){},
        key = pseudos.shift(),
        event = xtag.merge({
          base: key,
          pseudos: '',
          _pseudos: [],
          onAdd: noop,
          onRemove: noop,
          condition: noop
        }, xtag.customEvents[key] || {});
      event.type = key + (event.pseudos.length ? ':' + event.pseudos : '') + (pseudos.length ? ':' + pseudos.join(':') : '');
      if (fn) {
        var chained = xtag.applyPseudos(event.type, fn, event._pseudos);
        event.listener = function(){
          var args = xtag.toArray(arguments);
          if (event.condition.apply(this, [event].concat(args)) === false) return false;
          return chained.apply(this, args);
        };
      }
      return event;
    },

    addEvent: function (element, type, fn) {
      var event = (typeof fn == 'function') ? xtag.parseEvent(type, fn) : fn;
      event._pseudos.forEach(function(obj){
        obj.onAdd.call(element, obj);
      });
      event.onAdd.call(element, event, event.listener);
      xtag.toArray(event.base).forEach(function (name) {
        element.addEventListener(name, event.listener, xtag.captureEvents.indexOf(name) > -1);
      });
      return event.listener;
    },

    addEvents: function (element, events) {
      var listeners = {};
      for (var z in events) {
        listeners[z] = xtag.addEvent(element, z, events[z]);
      }
      return listeners;
    },

    removeEvent: function (element, type, fn) {
      var event = xtag.parseEvent(type);
      event.onRemove.call(element, event, fn);
      xtag.removePseudos(element, event.type, fn);
      xtag.toArray(event.base).forEach(function (name) {
        element.removeEventListener(name, fn);
      });
    },

    removeEvents: function(element, listeners){
      for (var z in listeners) xtag.removeEvent(element, z, listeners[z]);
    }

  };

  xtag.typeOf = doc.register.__polyfill__.typeOf;
  xtag.clone = doc.register.__polyfill__.clone;
  xtag.merge(xtag, doc.register.__polyfill__);

  if (typeof define == 'function' && define.amd) define(xtag);
  else win.xtag = xtag;

})();


(function(){

  var transform = xtag.prefix.js + 'Transform';
  function getState(el){
    var selected = xtag.query(el, 'x-slides > x-slide[selected]')[0] || 0;
    return [selected ? xtag.query(el, 'x-slides > x-slide').indexOf(selected) : selected, el.firstElementChild.children.length - 1];
  }

  function slide(el, index){
    var slides = xtag.toArray(el.firstElementChild.children);
    slides.forEach(function(slide){ slide.removeAttribute('selected'); });
    slides[index || 0].setAttribute('selected', null);
    el.firstElementChild.style[transform] = 'translate'+ (el.getAttribute('orientation') || 'x') + '(' + (index || 0) * (-100 / slides.length) + '%)';
  }

  function init(toSelected){    
    var slides = this.firstElementChild;
    if (!slides || !slides.children.length || slides.tagName.toLowerCase() != 'x-slides') return;
    
    var children = xtag.toArray(slides.children),
      size = 100 / (children.length || 1),
      orient = this.getAttribute('orientation') || 'x',
      style = orient == 'x' ? ['width', 'height'] : ['height', 'width'];
    
    slides.style[style[1]] =  '100%';
    slides.style[style[0]] = children.length * 100 + '%';
    slides.style[transform] = 'translate' + orient + '(0%)';
    children.forEach(function(slide){       
      slide.style[style[0]] = size + '%';
      slide.style[style[1]] = '100%';
    });    
    
    if (toSelected) {
      var selected = slides.querySelector('[selected]');
      if (selected) slide(this, children.indexOf(selected) || 0);
    }
  }

  xtag.register('x-slidebox', {
    events:{
      'transitionend': function(e){
        if (e.target == this) xtag.fireEvent(this, 'slideend');
      },
      'elementupgrade': function(e){
        if (e.target == this){
          init();
        }
      }
    },
    accessors:{
      orientation:{
        get: function(){
          return this.getAttribute('orientation');
        },
        set: function(value){
          this.setAttribute('orientation', value.toLowerCase());
          init.call(this, true);
        }
      }
    },
    methods: {
      slideTo: function(index){
        slide(this, index);
      },
      slideNext: function(){
        var shift = getState(this);
          shift[0]++;
        slide(this, shift[0] > shift[1] ? 0 : shift[0]);
      },
      slidePrevious: function(){
        var shift = getState(this);
          shift[0]--;
        slide(this, shift[0] < 0 ? shift[1] : shift[0]);
      }
    }
  });
  
  xtag.register('x-slide', {
    lifecycle:{
      inserted: function(){
        var ancestor = this.parentNode.parentNode;
        if (ancestor.tagName.toLowerCase() == 'x-slidebox') init.call(ancestor, true);
      }
    },
    events:{
      'elementupgrade': function(e){
        if (e.target == this){
          var ancestor = this.parentNode.parentNode;
          if (ancestor.tagName.toLowerCase() == 'x-slidebox') init.call(ancestor, true);
        }
      }
    }
  });
  
})();
(function(){

  function setScope(toggle){
    var form = toggle.firstChild.form;
    form ? toggle.removeAttribute('x-toggle-no-form') : toggle.setAttribute('x-toggle-no-form', '');
    toggle.xtag.scope = toggle.parentNode ? form || document : null;
  }
  
  function updateScope(scope){
    var names = {},
        docSelector = scope == document ? '[x-toggle-no-form]' : '';
    xtag.query(scope, 'x-toggle[name]' + docSelector).forEach(function(toggle){
      var name = toggle.name;
      if (name && !names[name]) {
        var named = xtag.query(scope, 'x-toggle[name="' + name + '"]' + docSelector),
            type = named.length > 1 ? 'radio' : 'checkbox';
        named.forEach(function(toggle){
          if (toggle.firstChild) toggle.firstChild.type = type;
        });
        names[name] = true;
      } 
    });
  }
  
  var shifted = false;
  function updateGroup(toggle, event){
    if ((shifted || (event.touches && event.touches.length)) && toggle.group && toggle.firstChild.type != 'radio') {
      var active = toggle.xtag.scope.querySelector('x-toggle[group="'+ toggle.group +'"][active]');
      if (active && toggle != active) {
        var self = toggle,
            state = active.checked,
            toggles = toggle.groupToggles,
            index = toggles.indexOf(toggle),
            activeIndex = toggles.indexOf(active);
        toggles.slice(Math.min(index, activeIndex), Math.max(index, activeIndex)).forEach(function(el){
          if (el != self) el.checked = state;
        });
      }
    }
  }
  
  xtag.addEvents(document, {
    'DOMComponentsLoaded': function(){
      updateScope(document);
      xtag.toArray(document.forms).forEach(updateScope);
    },
    'WebComponentsReady': function(){
      updateScope(document);
      xtag.toArray(document.forms).forEach(updateScope);
    },
    'keydown': function(e){
      shifted = e.shiftKey;
    },
    'keyup': function(e){
      shifted = e.shiftKey;
      if (e.keyCode == 32 && e.target.parentNode.nodeName == 'X-TOGGLE') updateGroup(e.target.parentNode, e);
    },
    'focus:delegate(x-toggle)': function(){
      this.setAttribute('focus', '');
    },
    'blur:delegate(x-toggle)': function(){
      this.removeAttribute('focus');
    },
    'tapend:delegate(x-toggle)': function(e){
      updateGroup(this, e);
    },
    'change:delegate(x-toggle)': function(e){
      var active = this.xtag.scope.querySelector('x-toggle[group="'+ this.group +'"][active]');
      this.checked = (shifted && active && (this != active)) ? active.checked : this.firstChild.checked;
      if (this.group && this.firstChild.type != 'radio') {
        this.groupToggles.forEach(function(toggle){
          toggle.active = false;
        });
        this.active = true;
      }
    }
  });  
  
  xtag.register('x-toggle', {
    lifecycle: {
      created: function(){
        this.innerHTML = '<input type="checkbox" /><div class="x-toggle-check"></div>';
        setScope(this);
        var name = this.getAttribute('name');
        if (name) this.firstChild.name = this.getAttribute('name');
        if (this.hasAttribute('checked')) this.checked = true;
      },
      inserted: function(){
        setScope(this);
        if (this.name) updateScope(this.xtag.scope);
      },
      removed: function(){
        updateScope(this.xtag.scope);
        setScope(this);
      }
    },
    accessors: {
      label: { attribute: {} },
      active: { attribute: { boolean: true } },
      group: { attribute: {} },
      groupToggles: {
        get: function(){
          return xtag.query(this.xtag.scope, 'x-toggle[group="' + this.group + '"]');
        }
      },
      name: {
        attribute: {},
        get: function(){
          return this.getAttribute('name');
        },
        set: function(name){
          if (name === null) {
            this.removeAttribute('name');
            this.firstChild.type = 'checkbox';
          }
          else this.firstChild.name = name;
          updateScope(this.xtag.scope);
        }
      },
      checked: {
        get: function(){
          return this.firstChild.checked;
        },
        set: function(value){
          var name = this.name,
              state = (value == 'true' || value === true);
          if (name) {
            var previous = xtag.query(this.xtag.scope, 'x-toggle[checked][name="' + name + '"]' + (this.xtag.scope == document ? '[x-toggle-no-form]' : ''))[0];
            if (previous) previous.removeAttribute('checked'); 
          }
          this.firstChild.checked = state;
          state ? this.setAttribute('checked', '') : this.removeAttribute('checked');
        }
      }
    }
  });
  
})();