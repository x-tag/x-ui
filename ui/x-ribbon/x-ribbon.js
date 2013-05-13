(function(){

  xtag.register('x-input', {
    lifecycle: {
      created: function(){
        this.inputElement = this.appendChild(document.createElement('input'));
        this.name = this.name;
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
        set: function(value){
          this.inputElement = value;
          this.setAttribute('name', value);
        }
      },
      value: {
        get: function(){
          return this.inputElement.value;
        },
        set: function(value){
          this.inputElement.value = value;
          this.setAttribute('value', value);
        }
      }
    }
  });

})();