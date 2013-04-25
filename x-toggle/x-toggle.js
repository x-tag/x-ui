(function(){

  function setScope(toggle){
    var form = toggle.firstChild.form;
    form ? toggle.removeAttribute('x-toggle-no-form') : toggle.setAttribute('x-toggle-no-form', null);
    toggle.xtag.scope = toggle.parentNode ? form || document : null;
  }
  
  function updateScope(scope){
    var names = {},
        docSelector = scope == document ? '[x-toggle-no-form]' : '';
    xtag.query(scope, 'x-toggle[name]' + docSelector).forEach(function(toggle){
      var name = toggle.name;
      if (name && !names[name]) {
        var group = xtag.query(scope, 'x-toggle[name="' + name + '"]' + docSelector),
            type = group.length > 1 ? 'radio' : 'checkbox';
        group.forEach(function(toggle){
          toggle.firstChild.type = type;
        });
        names[name] = true;
      } 
    });
  }
  
  xtag.addEvents(document, {
    'DOMComponentsLoaded': function(){
      updateScope(document);
      xtag.toArray(document.forms).forEach(updateScope);
    },
    'change:delegate(x-toggle)': function(){
      this.checked = this.firstChild.checked;
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
      name: {
        get: function(){
          return this.getAttribute('name');
        },
        'set:attribute': function(name){
          if (name == null) {
            this.removeAttribute('name');
            this.firstChild.type = 'checkbox';
          }
          else this.firstChild.name = name;
          updateScope(this.xtag.scope);
        }
      },
      label: {
        get: function(){
          return this.setAttribute('label');
        },
        'set:attribute': function(value){
          this.xtag.setAttribute('label', value);
        }
      },
      checked: {
        get: function(){
          return this.firstChild.checked;
        },
        set: function(value){
          var name = this.name,
              state = (value == 'true' || value == true);
          if (name) {
            var previous = xtag.query(this.xtag.scope, 'x-toggle[checked][name="' + name + '"]' + (this.xtag.scope == document ? '[x-toggle-no-form]' : ''))[0];
            if (previous) previous.removeAttribute('checked'); 
          }
          this.firstChild.checked = state;
          state ? this.setAttribute('checked', null) : this.removeAttribute('checked');
        }
      }
    }
  });
  
  
 /*  
  xtag.register('x-togglebar', {
    lifecycle: {
      created: function(){
        
      }
    },
    methods: {
      
    },
    events:{
      
    },
    accessors: {
      name: {
        get: function(){
          return this.getAttribute('name');
        },
        'set:attribute': function(value){
          this.xtag.input.name = value;
        }
      },
      label: {
        get: function(){
          return this.getAttribute('label');
        },
        'set:attribute': function(value){
          this.xtag.text.nodeValue = value;
        },
      },
      checked: {
        get: function(){
          return this.xtag.input.checked;
        },
        set: function(value){
          var state = (value == 'true' || value == true);
          this.xtag.input.checked = state;
          state ? this.setAttribute('checked', null) : this.removeAttribute('checked');
        }
      }
    }
  });
 */
})();