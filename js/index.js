// All ems with platform content should be styled as platform label
function fixPlatformLabels () {
  var ems = document.querySelectorAll('em');
  Array.prototype.forEach.call(ems, function (em) {
    if (em.textContent === 'macOS' || em.textContent === 'Linux' || em.textContent === 'Windows') {
      em.classList.add('platform-label');
    }
  })
}


// Override incorrect styling of string templates and colons in objects
function fixSyntaxHighlighting () {
  var sts = document.querySelectorAll('.err');
  Array.prototype.forEach.call(sts, function (st) {
    if (st.textContent === '`' || st.textContent === ':') {
      st.classList.remove('err');
    }
  })
}


document.addEventListener('DOMContentLoaded', function () {
  fixPlatformLabels();
  fixSyntaxHighlighting();
});


(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
    m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');


$( document ).ready(function() {
  console.log("document ready");
  ga('create', 'UA-98523566-1', 'auto');
  ga('send', 'pageview');
});
