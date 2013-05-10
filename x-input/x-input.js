(function(){
  
  xtag.register('x-input', {
    lifecycle: {
      created: function(){
        var input = this.xtag.input = this.appendChild(document.createElement('input'));
        this.xtag.input.className = 'x-input-text';
      }
    },
    methods: {
      focus: function(){
        this.xtag.input.focus();
      },
      blur: function(){
        this.xtag.input.blur();
      },
      clear: function(){
        this.value = '';
        this.xtag.input.focus();
        this.removeAttribute('loading');
        xtag.fireEvent(this, 'clear');
        xtag.fireEvent(this.xtag.input, 'change');
      }
    },
    events:{
      focus: function(e){
        this.setAttribute('focus', '');
      },
      blur: function(e){
        this.removeAttribute('focus');
      },
      'tap:delegate([x-input-clear])': function(e){
        this.parentNode.clear();
      },
      'change:delegate(.x-input-text)': function(e){
        this.parentNode.value = this.value;
      },
      'keypress': function(e){
        switch(e.keyCode) {
          case 13:
            if (this.autospin) {
              
            }
            break;
          case 27:
            this.clear();
            break;
        }
      }
    },
    accessors: {
      autospin: {
        attribute: { boolean: true }
      },
      loading: {
        attribute: { boolean: true }
      },
      name: {
        attribute: {
          selector: 'input'
        }
      },
      maxlength: {
        attribute: {
          property: 'input'
        }
      },
      autofocus: {
        attribute: {
          boolean: true,
          property: 'input'
        },
        set: function(){
          this.xtag.input.focus();
        }
      },
      autocomplete: {
        attribute: {
          boolean: true,
          property: 'input'
        }
      },
      minChar: {
        attribute: {},
        set: function(value){
          this.setAttribute('min-char', this.xtag.minChar = Number(value) || 0);
        }
      },
      value: {
        attribute: {},
        get: function(){
          return this.xtag.input.value;
        },
        set: function(value){
          this.xtag.input.value = value;
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