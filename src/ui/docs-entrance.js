/* Docs entrance animation - no getar, liquid glass */
(function(){
  try{
    document.body.classList.add('docs-entering');
    window.addEventListener('load', function(){
      setTimeout(function(){
        document.body.classList.remove('docs-entering');
        document.body.classList.add('docs-entered');
      }, 120);
    });
    // fallback if load already fired
    if(document.readyState==='complete'){
      setTimeout(function(){
        document.body.classList.remove('docs-entering');
        document.body.classList.add('docs-entered');
      }, 120);
    }
  }catch(e){}
})();
