var sq = window.sq;
var article_spot = -1;
//THIS IS A GLOBAL COPY OF AN ANONYMOUS DATA 
//STRUCTURE DO EVERYTHING THAT NODES DOES
var nodesCOPY;
var nodes;
var karaoke_text;

sq.version = '0.0.1';
sq.host =  window.location.search.match('sq-dev') ?
  document.scripts[document.scripts.length - 1].src.match(/\/\/.*\//)[0]
        : '//www.princeton.edu/~nagakura/';

// include jQuery
var jQuery = document.createElement('script');
jQuery.src = '//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js';
jQuery.type = 'text/javascript';
document.getElementsByTagName('head')[0].appendChild(jQuery);

(function(Keen){
  Keen.addEvent('load');

  on('mousemove', function(){
    document.querySelector('.sq .modal').style.cursor = 'auto';
  });

  (function makeSquirt(read, makeGUI) {

    on('squirt.again', startSquirt);
    injectStylesheet(sq.host + 'font-awesome.css');
    injectStylesheet(sq.host + 'squirt.css', function stylesLoaded(){
      makeGUI();
      startSquirt();
    });

    function startSquirt(){
      Keen.addEvent('start');
      showGUI();
      getText(read);
    };

    //GRABS THE TEXT
    function getText(read){
      // text source: demo
      if(window.squirtText) return read(window.squirtText);

      // text source: selection
      var selection = window.getSelection();
      if(selection.type == 'Range') {
        var container = document.createElement("div");
        for (var i = 0, len = selection.rangeCount; i < len; ++i) {
          container.appendChild(selection.getRangeAt(i).cloneContents());
        }
        return read();
      }

      // text source: readability
      var handler;
      function readabilityReady(){
        handler && document.removeEventListener('readility.ready', handler);
        read(readability.grabArticleText());
      };

      if(window.readability) return readabilityReady();

      makeEl('script', {
        src: sq.host + 'readability.js'
      }, document.head);
      handler = on('readability.ready', readabilityReady);
    };
  })(makeRead(makeTextToNodes(wordToNode), makeTextToKaraokeNodes(wordToNode)),  makeGUI);

  function makeRead(textToNodes, textToKaraokeNodes) {
    sq.paused = true;
    var nodeIdx,
        lastNode,
        nextNodeTimeoutId;
    var lastNodeHeight = -1;

    function getKaroakeWordEl(article_spot) {
      var numWordsSeen = 0;
      var paragraphIndex = 0;
      var lastNumWordsSeen = 0;

      // dangerous we should check if we're out of the array boundary
      while (numWordsSeen <= article_spot) {
        var a = document.getElementById("karaoke-text").children[paragraphIndex++];
        lastNumWordsSeen = a.children.length;
        numWordsSeen += a.children.length;
      }

      var paragraphEl = document.getElementById("karaoke-text").children[paragraphIndex - 1];

      return paragraphEl.children[article_spot - (numWordsSeen - lastNumWordsSeen)];
    }


    function incrememntNodeIdx(increment){
      var ret = nodeIdx;
      nodeIdx += increment || 1;

      nodeIdx = Math.max(0, nodeIdx);
      prerender();

      //get the word to highlight
      var a = getKaroakeWordEl(article_spot);

      // scroll a little if necessary. arbitrarily check only after fifth word
      // because sometimes weird change shit happens in the first few words
      // condition >= 1 is necessary because we set height later
      var id = "karaoke_word" + article_spot;
      var offset = $("#"+id).offset();

      if (article_spot > 5 && lastNodeHeight != -1 && offset !== undefined) {
        var change = offset["top"] - lastNodeHeight;
        if (change > 0) {
          console.log("lastHeight " + lastNodeHeight);
          console.log("offset " + offset["top"]);
          console.log("spot " + article_spot);
        }

        // if there is any scrolling to be done, do it
        if (change > 0) {
          var b = document.getElementById("karaoke-text").getAttribute('style').replace(/\D/g,'');
          b = (parseInt(b, 10)+change);
          b = "bottom:" + b + "px";
          document.getElementById("karaoke-text").setAttribute('style', b);
        }
      }
      // set the lastNodeHeight if there is an offset defined ie we aren't in a new paragraph
      // long term we should fix the sequence numbers of id's so that this doesn't happen
      if (offset !== undefined) {
        lastNodeHeight = offset["top"];
      }

      // this is to kill the first node which we hacked onto the word container
      nodes[0].style.display = 'none';
      

      //a.style.color = "#FFFF66";
      if (typeof a != "undefined")
        a.setAttribute('class', 'karaoke-highlighted');
      else
        console.log('yo');

      return ret;
    };

    var intervalMs, _wpm;
    function wpm(wpm){
      _wpm = wpm;
      intervalMs = 60 * 1000 / wpm ;
    };

    (function readerEventHandlers(){
      on('squirt.close', function(){
        sq.closed = true;
        clearTimeout(nextNodeTimeoutId);
        Keen.addEvent('close');
      });

      on('squirt.wpm.adjust', function(e){
        dispatch('squirt.wpm', {value: e.value + _wpm});
      });

      on('squirt.wpm', function(e){
        sq.wpm = Number(e.value);
        wpm(e.value);
        dispatch('squirt.wpm.after');
        e.notForKeen == undefined && Keen.addEvent('wpm', {'wpm': sq.wpm});
      });

      on('squirt.pause', pause);
      on('squirt.play', play);

      on('squirt.play.toggle', function(){
        dispatch(sq.paused ? 'squirt.play' : 'squirt.pause');
      });

      on('squirt.rewind', function(e){
        // Rewind by `e.value` seconds. Then walk back to the
        // beginning of the sentence.
        !sq.paused && clearTimeout(nextNodeTimeoutId);
        incrememntNodeIdx(-Math.floor(e.seconds * 1000 / intervalMs));
        while(!nodes[nodeIdx].word.match(/\./) && nodeIdx < 0){
          incrememntNodeIdx(-1);
        }
        nextNode(true);
        Keen.addEvent('rewind');
      });
    })();

    function pause(){
      sq.paused = true;
      dispatch('squirt.pause.after');
      clearTimeout(nextNodeTimeoutId);
      Keen.addEvent('pause');
    };



    function play(e){
      sq.paused = false;
      dispatch('squirt.pause.after');
      document.querySelector('.sq .wpm-selector').style.display = 'none'
      nextNode(e.jumped);

      e.notForKeen === undefined && Keen.addEvent('play');
    };

    var toRender;
    function prerender(){
      toRender = nodes[nodeIdx];
      if(toRender == null) return;
      prerenderer.appendChild(toRender);
      nodes[nodeIdx].center();

    }

    function finalWord(){
      Keen.addEvent('final-word');
      toggle(document.querySelector('.sq .reader'));
      if(window.location.hostname.match('squirt.io|localhost')){
        window.location.href = '/install.html';
      } else {
        showTweetButton(nodes.length,
          (nodes.length * intervalMs / 1000 / 60).toFixed(1));
      }
      toggle(finalWordContainer);
      return;
    };

    var delay, jumped, nextIdx;
    function nextNode(jumped) {
      article_spot = article_spot + 1;


      lastNode && lastNode.remove();

      nextIdx = incrememntNodeIdx();
      if(nextIdx >= nodes.length) return finalWord();

      lastNode = nodes[nextIdx];
      wordContainer.appendChild(lastNode);
      lastNode.instructions && invoke(lastNode.instructions);
      if(sq.paused) return;
      nextNodeTimeoutId = setTimeout(nextNode, intervalMs * getDelay(lastNode, jumped));
    };

    var waitAfterShortWord = 1.2;
    var waitAfterComma = 2;
    var waitAfterPeriod = 3;
    var waitAfterParagraph = 3.5;
    var waitAfterLongWord = 1.5;
    function getDelay(node, jumped){
      var word = node.word;
      if(jumped) return waitAfterPeriod;
      if(word == "Mr." ||
          word == "Mrs." ||
          word == "Ms.") return 1;
      var lastChar = word[word.length - 1];
      if(lastChar.match('”|"')) lastChar = word[word.length - 2];
      if(lastChar == '\n') return waitAfterParagraph;
      if('.!?'.indexOf(lastChar) != -1) return waitAfterPeriod;
      if(',;:–'.indexOf(lastChar) != -1) return waitAfterComma;
      if(word.length < 4) return waitAfterShortWord;
      if(word.length > 11) return waitAfterLongWord;
      return 1;
    };

    function showTweetButton(words, minutes){
      var html = "<div>You just read " + words + " words in " + minutes + " minutes!</div>";
      var tweetString = "I read " + words + " words in " + minutes + " minutes without breaking a sweat&mdash;www.squirt.io turns your browser into a speed reading machine!";
      var paramStr = encodeURI("url=squirt.io&user=squirtio&size=large&text=" +
          tweetString);
      html += '<iframe class=\"tweet-button\" '
               + 'allowtransparency=\"true\" frameborder=\"0\"'
               + ' scrolling=\"no\"'
               + ' src=\"https://platform.twitter.com/widgets/tweet_button.html?'
               + paramStr + '\"'
               + ' style=\"width:120px; height:20px;\"></iframe>';
      finalWordContainer.innerHTML = html;
    };

    function showInstallLink(){
      finalWordContainer.innerHTML = "<a class='install' href='/install.html'>Install Squirt</a>";
    };

    function readabilityFail(){
        Keen.addEvent('readability-fail');
        var modal = document.querySelector('.sq .modal');
        modal.innerHTML = '<div class="error">Oops! This page is too hard for Squirt to read. We\'ve been notified, and will do our best to resolve the issue shortly.</div>';
    };

    dispatch('squirt.wpm', {value: 400, notForKeen: true});

    var wordContainer,
        prerenderer,
        finalWordContainer;
    function initDomRefs(){
      wordContainer = document.querySelector('.sq .word-container');
      invoke(wordContainer.querySelectorAll('.sq .word'), 'remove');
      prerenderer = document.querySelector('.sq .word-prerenderer');
      finalWordContainer = document.querySelector('.sq .final-word');
      document.querySelector('.sq .reader').style.display = 'block';
      document.querySelector('.sq .final-word').style.display = 'none';
    };

    return function read(text) {
      initDomRefs();
      if(!text) return readabilityFail();

      nodes = textToNodes(text);
            console.log(nodes);

      //NODE COPY THIS IS BAD
      nodesCOPY = textToKaraokeNodes(text);
      console.log(nodesCOPY);
      nodeIdx = 0;

      prerender();
      dispatch('squirt.play');
      dispatch('squirt.pause');
    };
  };

  function makeTextToNodes(wordToNode) {
    return function textToNodes(text) {
      text = text.trim('\n').replace(/\s+\n/g,'\n');
      return text
             .replace(/[\,\.\!\:\;](?![\"\'\)\]\}])/g, "$& ")
             .split(/[\s]+/g)
             .filter(function(word){ return word.length; })
             .map(wordToNode);
    };
  };

  function makeTextToKaraokeNodes(wordToNode) {
    return function textToKaraokeNodes(text) {
      text = text.trim('\n').replace(/\s+\n/g,'\n');
      return text
             .replace(/[\,\.\!\:\;](?![\"\'\)\]\}])/g, "$& ")
             .split(' ')
             .filter(function(word){ return word.length; })
             .map(wordToNode);
    };
  };
  var instructionsRE = /#SQ(.*)SQ#/;
  function parseSQInstructionsForWord(word, node){
    var match = word.match(instructionsRE);
    if(match && match.length > 1){
      node.instructions = [];
      match[1].split('#')
      .filter(function(w){ return w.length; })
      .map(function(instruction){
        var val = Number(instruction.split('=')[1]);
        node.instructions.push(function(){
          dispatch('squirt.wpm', {value: val, notForKeen: true})
        });
      });
      return word.replace(instructionsRE, '');
    };
    return word;
  };

  // ORP: Optimal Recgonition Point
  function getORPIndex(word){
    var length = word.length;
    var lastChar = word[word.length - 1];
    if(lastChar == '\n'){
      lastChar = word[word.length - 2];
      length--;
    }
    if(',.?!:;"'.indexOf(lastChar) != -1) length--;
    return length <= 1 ? 0 :
      (length == 2 ? 1 :
          (length == 3 ? 1 :
              Math.floor(length / 2) - 1));
  };

  function wordToNode(word) {
    var node = makeDiv({'class': 'word'});
    node.word = parseSQInstructionsForWord(word, node);

    var orpIdx = getORPIndex(node.word);

    node.word.split('').map(function charToNode(char, idx) {
      var span = makeEl('span', {}, node);
      span.textContent = char;
      if(idx == orpIdx) span.classList.add('orp');
    });

    node.center = (function(orpNode) {
      var val = orpNode.offsetLeft + (orpNode.offsetWidth / 2);
      node.style.left = "-" + val + "px";
    }).bind(null, node.children[orpIdx]);

    return node;
  };

  var disableKeyboardShortcuts;
  function showGUI(){
    blur();
    document.querySelector('.sq').style.display = 'block';
    disableKeyboardShortcuts = on('keydown', handleKeypress);
  };

  function hideGUI(){
    unblur();
    document.querySelector('.sq').style.display = 'none';
    disableKeyboardShortcuts && disableKeyboardShortcuts();
  };

  var keyHandlers = {
      32: dispatch.bind(null, 'squirt.play.toggle'),
      27: dispatch.bind(null, 'squirt.close'),
      38: dispatch.bind(null, 'squirt.wpm.adjust', {value: 10}),
      40: dispatch.bind(null, 'squirt.wpm.adjust', {value: -10}),
      37: dispatch.bind(null, 'squirt.rewind', {seconds: 10})
  };

  function handleKeypress(e){
    var handler = keyHandlers[e.keyCode];
    handler && (handler(), e.preventDefault())
    return false;
  };

  function blur(){
    map(document.body.children, function(node){
      if(!node.classList.contains('sq'))
        node.classList.add('sq-blur');
    });
  };

  function unblur(){
    map(document.body.children, function(node){
      node.classList.remove('sq-blur');
    });
  }

  function makeGUI(){
    var squirt = makeDiv({class: 'sq'}, document.body);
    squirt.style.display = 'none';
    on('squirt.close', hideGUI);
    var obscure = makeDiv({class: 'sq-obscure'}, squirt);
    on(obscure, 'click', function(){
      dispatch('squirt.close');
    });

    on(window, 'orientationchange', function(){
      Keen.addEvent('orientation-change', {'orientation': window.orientation});
    });

    var modal = makeDiv({'class': 'modal'}, squirt);

    var controls = makeDiv({'class':'controls'}, modal);
    var reader = makeDiv({'class': 'reader'}, modal);
    var wordContainer = makeDiv({'class': 'word-container'}, reader);
    makeDiv({'class': 'focus-indicator-gap'}, wordContainer);
    makeDiv({'class': 'word-prerenderer'}, wordContainer);
    makeDiv({'class': 'final-word'}, modal);
    var keyboard = makeDiv({'class': 'keyboard-shortcuts'}, reader);
    keyboard.innerText = "Keys: Space, Esc, Up, Down";

    (function make(controls){

      // this code is suffering from delirium
      (function makeWPMSelect(){

        // create the ever-present left-hand side button
        var control = makeDiv({'class': 'sq wpm sq control'}, controls);
        var wpmLink = makeEl('a', {}, control);
        bind("{{wpm}} WPM", sq, wpmLink);
        on('squirt.wpm.after', wpmLink.render);
        on(control, 'click', function(){
          toggle(wpmSelector) ?
            dispatch('squirt.pause') :
            dispatch('squirt.play');
        });

        // create the custom selector
        var wpmSelector = makeDiv({'class': 'sq wpm-selector'}, controls);
        wpmSelector.style.display = 'none';
        var plus50OptData = {add: 50, sign: "+"};
        var datas = [];
        for(var wpm = 200; wpm < 1000; wpm += 100){
          var opt = makeDiv({'class': 'sq wpm-option'}, wpmSelector);
          var a = makeEl('a', {}, opt);
          a.data = { baseWPM: wpm };
          a.data.__proto__ = plus50OptData;
          datas.push(a.data);
          bind("{{wpm}}",  a.data, a);
          on(opt, 'click', function(e){
            dispatch('squirt.wpm', {value: e.target.firstChild.data.wpm});
            dispatch('squirt.play');
            wpmSelector.style.display = 'none';
          });
        };

        // create the last option for the custom selector
        var plus50Opt = makeDiv({'class': 'sq wpm-option sq wpm-plus-50'}, wpmSelector);
        var a = makeEl('a', {}, plus50Opt);
        bind("{{sign}}50", plus50OptData, a);
        on(plus50Opt, 'click', function(){
          datas.map(function(data){
            data.wpm = data.baseWPM + data.add;
          });
          var toggle = plus50OptData.sign == '+';
          plus50OptData.sign = toggle ? '-' : '+';
          plus50OptData.add = toggle ? 0 : 50;
          dispatch('squirt.els.render');
        });
        dispatch('click', {}, plus50Opt);
      })();

      (function makeRewind(){
        var container = makeEl('div', {'class': 'sq rewind sq control'}, controls);
        var a = makeEl('a', {}, container);
        a.href = '#';
        on(container, 'click', function(e){
          dispatch('squirt.rewind', {seconds: 10});
          e.preventDefault();
        });
        a.innerHTML = "<i class='fa fa-backward'></i> 10s";
      })();

      (function makePause(){
        var container = makeEl('div', {'class': 'sq pause control'}, controls);
        var a = makeEl('a', {'href': '#'}, container);
        var pauseIcon = "<i class='fa fa-pause'></i>";
        var playIcon = "<i class='fa fa-play'></i>";
        function updateIcon(){
          a.innerHTML = sq.paused ? playIcon : pauseIcon;
        }
        on('squirt.pause.after', updateIcon);
        on(container, 'click', function(clickEvt){
          dispatch('squirt.play.toggle');
          clickEvt.preventDefault();
        });
        updateIcon();
      })();
    })(controls);

    (function makeKaraoke() {
        var karaoke = makeEl('div', {'class': 'sq karaoke'}, squirt);
        // var karaoke_title = makeDiv({'class': 'karaoke-title'}, karaoke);
        //   karaoke_title.innerText = "Full Text!!!!!!!!!!";
        karaoke_text = makeDiv({'class': 'karaoke-textbox', 'id': 'karaoke-text', 'style': 'bottom:0px'}, karaoke);        


        // var handler;
        function readabilityReadyKaraoke(){
          readability.hello();
          //var a = readability.grabArticle();
          //karaoke_articleText.innerText = a.innerText.trim();
          
          var nodesCOPYhandler = function nodesCOPYReady() {
            var karaoke_paragraph = makeEl('div', {'class': 'sq karaoke-paragraph'}, karaoke_text);
            for (var i = 0; i < nodesCOPY.length; i++) {
              // TODO: we should fix the way id's are assigned to not skip one for new paragraphs
              //nodesCOPY[i].textContent += " ";
              if (nodesCOPY[i].textContent.localeCompare('\n') == 0) {
                karaoke_paragraph = makeEl('div', {'class': 'sq karaoke-paragraph'}, karaoke_text);
                console.log("adpsfoanspd");

              }
              else if (i == 0) {
                var karaoke_articleWord = makeEl('div', {'class':'sq karaoke-highlighted'}, karaoke_paragraph);
                karaoke_articleWord.setAttribute('id', "karaoke_word" + i);

                karaoke_articleWord.textContent = nodesCOPY[i].textContent;
              }
              else {
                var karaoke_articleWord = makeEl('div', {'class':'sq karaoke-word'}, karaoke_paragraph);
                karaoke_articleWord.setAttribute('id', "karaoke_word" + i);

                karaoke_articleWord.textContent = nodesCOPY[i].textContent;
              }
            };

            // display first word
            // TODO: don't be so fucking hacky and do this in nextNode or something better
            // TODO: basically figure out why what we changed got rid of the first guy when we took out the 3 2 1 or maybe elsewhere?
            wordContainer.appendChild(nodes[0]);
            // lastNode = nodes[0];

          };
           on('squirt.play', nodesCOPYhandler);
          //nodesCOPYhandler();

          //GO THROUGH NODE COPY LIST AND GET THE COMPLETE TEXT
        };

        on('readability.ready', readabilityReadyKaraoke);

        
    })();
  };

  // utilites

  function map(listLike, f){
    listLike = Array.prototype.slice.call(listLike); // for safari
    return Array.prototype.map.call(listLike, f);
  }

  // invoke([f1, f2]); // calls f1() and f2()
  // invoke([o1, o2], 'func'); // calls o1.func(), o2.func()
  // args are applied to both invocation patterns
  function invoke(objs, funcName, args){
    args = args || [];
    var objsAreFuncs = false;
    switch(typeof funcName){
      case "object":
      args = funcName;
      break;
      case "undefined":
      objsAreFuncs = true;
    };
    return map(objs, function(o){
      return objsAreFuncs ? o.apply(null, args) : o[funcName].apply(o, args);
    });
  }

  function makeEl(type, attrs, parent) {
    var el = document.createElement(type);
    for(var k in attrs){
      if(!attrs.hasOwnProperty(k)) continue;
      el.setAttribute(k, attrs[k]);
    }
    parent && parent.appendChild(el);
    return el;
  };

  // data binding... *cough*
  function bind(expr, data, el){
    el.render = render.bind(null, expr, data, el);
    return on('squirt.els.render', function(){
      el.render();
    });
  };

  function render(expr, data, el){
    var match, rendered = expr;
    expr.match(/{{[^}]+}}/g).map(function(match){
      var val = data[match.substr(2, match.length - 4)];
      rendered = rendered.replace(match, val == undefined ? '' : val);
    });
    el.textContent = rendered;
  };

  function makeDiv(attrs, parent){
    return makeEl('div', attrs, parent);
  };

  function injectStylesheet(url, onLoad){
    var el = makeEl('link', {
      rel: 'stylesheet',
      href: url,
      type: 'text/css'
    }, document.head);
    function loadHandler(){
      onLoad();
      el.removeEventListener('load', loadHandler)
    };
    onLoad && on(el, 'load', loadHandler);
  };


  function on(bus, evts, cb){
    if(cb === undefined){
      cb = evts;
      evts = bus;
      bus = document;
    }
    evts = typeof evts == 'string' ? [evts] : evts;
    var removers = evts.map(function(evt){
      bus.addEventListener(evt, cb);
      return function(){
        bus.removeEventListener(evt, cb);
      };
    });
    if(removers.length == 1) return removers[0];
    return removers;
  };

  function dispatch(evt, attrs, dispatcher){
    var evt = new Event(evt);
    for(var k in attrs){
      if(!attrs.hasOwnProperty(k)) continue
      evt[k] = attrs[k];
    }
    (dispatcher || document).dispatchEvent(evt);
  };

  function toggle(el){
    var s = window.getComputedStyle(el);
    return (el.style.display = s.display == 'none' ? 'block' : 'none') == 'block';
  };

})((function injectKeen(){
  window.Keen=window.Keen||{configure:function(e){this._cf=e},addEvent:function(e,t,n,i){this._eq=this._eq||[],this._eq.push([e,t,n,i])},setGlobalProperties:function(e){this._gp=e},onChartsReady:function(e){this._ocrq=this._ocrq||[],this._ocrq.push(e)}};(function(){var e=document.createElement("script");e.type="text/javascript",e.async=!0,e.src=("https:"==document.location.protocol?"https://":"http://")+"dc8na2hxrj29i.cloudfront.net/code/keen-2.1.0-min.js";var t=document.getElementsByTagName("script")[0];t.parentNode.insertBefore(e,t)})();

  var Keen = window.Keen;
  var prod = {
      projectId: "531d7ffd36bf5a1ec4000000",
      writeKey: "9bdde746be9a9c7bca138171c98d6b7a4b4ce7f9c12dc62f0c3404ea8c7b5415a879151825b668a5682e0862374edaf46f7d6f25772f2fa6bc29aeef02310e8c376e89beffe7e3a4c5227a3aa7a40d8ce1dcde7cf28c7071b2b0e3c12f06b513c5f92fa5a9cfbc1bebaddaa7c595734d"
  };
  var dev = {
    projectId: "531aa8c136bf5a0f8e000003",
    writeKey: "a863509cd0ba1c7039d54e977520462be277d525f29e98798ae4742b963b22ede0234c467494a263bd6d6b064413c29cd984e90e6e6a4468d36fed1b04bcfce6f19f50853e37b45cb283b4d0dfc4c6e7a9a23148b1696d7ea2624f1c907abfac23a67bbbead623522552de3fedced628"
  };

  Keen.configure(sq.host.match('squirt.io') ? prod : dev);

  function addon(name, input, output){
    return { name: name, input: input, output: output};
  }

  function guid(){
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });
  };

  Keen.setGlobalProperties(function(){
    var props = {
      source: "bookmarklet",
      userId: sq.userId || 'beta-user',
      href: window.location.href,
      rawUserAgent: "${keen.user_agent}",
      sessionId: 'sq-sesh-' + guid(),
      ip: "${keen.ip}",
      keen: { addons: [] },
      referrer: document.referrer,
      app_version: sq.version
    };
    var push = Array.prototype.push.bind(props.keen.addons);
    push(addon("keen:ip_to_geo", { ip: "ip" }, "geo"));
    push(addon("keen:ua_parser", { ua_string: "rawUserAgent" }, "userAgent"));
    return props;
  });

  return Keen;
})());
