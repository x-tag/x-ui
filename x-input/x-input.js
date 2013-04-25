(function(){
  
  xtag.register('x-input', {
    lifecycle: {
      created: function(){
        this.xtag.input = this.appendChild(document.createElement('input'));
        this.xtag.input.className = 'x-input-text';
        this.name = this.getAttribute('name');
        this.value = this.value;
      }
    },
    methods: {
      clear: function(){
        this.xtag.input.value = '';
        this.xtag.input.focus();
        this.removeAttribute('data-loading')
        xtag.fireEvent(this, 'clear');
      }
    },
    events:{
      focus: function(e){
        this.setAttribute('focus', null);
      },
      blur: function(e){
        this.removeAttribute('focus');
      },
      'tap:delegate([data-clear])': function(e){
        e.currentTarget.clear();
      },
      'change:delegate(.x-input-text)': function(){
        this.setAttribute('value', this.value);
        this.parentNode.setAttribute('value', this.value);
      }
    },
    accessors: {
      name: {
        get: function(){
          return this.getAttribute('name');
        },
        'set:attribute': function(name){
          if (name == null) this.removeAttribute('name');
          else this.xtag.input.name = name;
        }
      },
      value: {
        get: function(){
          return this.xtag.input.value || this.getAttribute('value');
        },
        set: function(value){
          this.xtag.input.value = value;
          this.setAttribute('value', value);
        }
      },
      controlElements: {
        writeable: false,
        get: function(){
          return xtag.queryChildren(this, '*:not(input)');
        }
      }
    }
  });

})();