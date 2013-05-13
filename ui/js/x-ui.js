(function(){

  xtag.addEvents(document, {
    'tapstart': function(e){
      e.target.setAttribute('pressed', '');
    },
    'tapend': function(e){
      xtag.query(document, '[pressed]').forEach(function(el){
        el.removeAttribute('pressed');
      });
    }
  });
  
})();