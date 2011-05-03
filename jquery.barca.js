/*
 * jQuery Barca
 *
 * Copyright 2011, aligo Kang
 * http://aligo.me/
 * Dual licensed under the MIT or GPL Version 2 licenses.
 */

(function($, undefined) {

var barca = {

    settings : {
        loading : 'loading...',
        original : function() {
            var origin = $('body').html()
            return {
              callback : function() {
                  $('body').html(origin)
              }
            }
        },
        hashchange : function( new_hash, old_hash ) { },
        useHash : function() {
            if ( !window.history || !window.history.pushState ) return true
            else return false
        },
        baseurl : function() {
            return window.location.protocol + '//' + window.location.host + '/'
        }
    },

    stack : [],

    state : 1,

    inited : false,

    hashStack : [],

    popStack : function ( state_id ) {
        barca.state = state_id
        var state = barca.stack[state_id]
        if ( state && state.callback ) {
            state.callback()
            return true
        }
        return false
    }

}

var getValueOrCall = function ( target ) {
    return ( $.isFunction(target) ) ? target() : target
}

$.extend({

    barcaSetup : function ( target, settings ) {

		if ( !settings ) {
			settings = target
			target = $.extend( true, barca.settings, settings )
		} else {
			$.extend( true, target, barca.settings, settings )
		}

		for( var field in { context: 1, url: 1 } ) {
			if ( field in settings ) {
				target[ field ] = settings[ field ]
			} else if( field in barca.settings ) {
				target[ field ] = barca.settings[ field ]
			}
		}

        target.href = getValueOrCall( target.url )
        var href = target.href.split('#')
        target.url = href[0]
        target.hash = href[1] || undefined

        target.useHash = getValueOrCall( target.useHash )
        target.baseurl = getValueOrCall( target.baseurl )

		return target
	},


    barca : function( url, options ) {

        if ( typeof url === "object" ) {
            options = url
            url = undefined
        }else{
            options.url = url
        }
        options = options || {}

        var s = jQuery.barcaSetup( {}, options )

        var old_hash = window.location.hash

        var success = s.success
        s.success = function(data, status, xhr){
            var args = arguments
            var state_id = barca.state

            barca.stack[state_id] = {
                callback : function() {
                    success.apply(this, args)
                    s.hashchange(s.hash, old_hash)
                }
            }
            barca.stack[state_id].callback()

            if ( !s.useHash ) window.history.replaceState(state_id, document.title, window.location.href)

            if (window._gaq) _gaq.push(['_trackPageview'])
        }

        if ( !barca.inited ) {
            barca.inited = true
            barca.stack[1] = s.original()
            if ( !s.useHash ) {
                window.history.replaceState(1, document.title, window.location.href)
            } else {
                barca.hashStack[barca.state] = window.location.hash
            }
        }
        barca.state ++
        if ( !s.useHash ) {
            window.history.pushState(barca.state, s.loading, s.href)
        } else {
            if ( 0 === s.url.indexOf(s.baseurl) ) {
                var hashstate = '!' + s.url.substring( s.baseurl.length )
                if (undefined !== s.hash) hashstate = s.hash + hashstate
                hashstate = '#' + hashstate
                barca.hashStack[barca.state] = hashstate
                barca.hashStack.length = barca.state + 1
                window.location.hash = hashstate
            }
        }
        document.title = s.loading

        var xhr = barca.xhr
        if ( xhr && xhr.readyState < 4) {
            xhr.onreadystatechange = $.noop
            xhr.abort()
        }

        barca.xhr = $.ajax(s)
    }
})


if ( $.event.props.indexOf('state') < 0 ) $.event.props.push('state')

$(window).bind('popstate', function( event ) {
    var state_id = event.state
    if ( state_id ) {
        barca.popStack(state_id)
    }
})


$(window).bind('hashchange', function() {
    if ( barca.hashStack[barca.state] !== window.location.hash ) {
        var indices = []
        var idx = barca.hashStack.indexOf(window.location.hash)
        while (idx != -1) {
            indices.push(idx)
            idx = barca.hashStack.indexOf(window.location.hash, idx + 1)
        }
        if ( 0 !== indices.length) {
            indices.sort(function( a, b ) {
                return Math.abs(a - barca.state) - Math.abs(b - barca.state)
            })
            barca.popStack(indices[0])
        }
    }
})

})(jQuery);