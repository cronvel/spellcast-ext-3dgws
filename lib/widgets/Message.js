/*
	3D Graphics With Sounds

	Copyright (c) 2020 - 2025 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;

/* global BABYLON */



const TextBox = require( './TextBox.js' ) ;

const extension = require( '../browser-extension.js' ) ;

const deepExtend = require( 'tree-kit/lib/extend.js' ).bind( null , { deep: true } ) ;
const Promise = require( 'seventh' ) ;



function Message( dom , gScene , text , options = {} , parent = null ) {
	TextBox.call( this , dom , gScene , text , options , parent ) ;

	//this.type = options.type ;
	this.wait = options.wait || 0 ;
	this.slowTyping = !! options.slowTyping ;
	this.next = !! options.next ;

	this.babylon.nextImage = null ;
}

Message.prototype = Object.create( TextBox.prototype ) ;
Message.prototype.constructor = Message ;

module.exports = Message ;



Message.prototype.destroy = function() {
	TextBox.prototype.destroy.call( this ) ;
	if ( this.babylon.nextImage ) { this.babylon.nextImage.dispose() ; }
} ;



Message.prototype.run = async function() {
	if ( ! this.guiCreated ) { this.createGUI() ; }

	if ( this.slowTyping ) { await this.slowType() ; }
	if ( this.next ) { await this.confirm() ; }
	if ( this.wait ) { await Promise.resolveTimeout( this.wait * 1000 ) ; }

	this.destroy() ;
} ;



const THEME = Message.THEME = deepExtend( {} , TextBox.THEME , {
	default: {
		panel: {
			width: 0.5 ,
			height: 0.2 ,
			backgroundColor: "green" ,
			borderColor: "orange" ,
			borderWidth: 4 ,
			cornerRadius: 20 ,
			padding: {
				left: "10px" ,
				top: "10px" ,
				right: "10px" ,
				bottom: "10px"
			}
		} ,
		text: {
			color: "white"
		}
	}
} ) ;



Message.prototype.createGUI = function( theme = this.dom.themeConfig?.message?.default , defaultTheme = THEME.default ) {
	if ( this.guiCreated ) { return ; }

	TextBox.prototype.createGUI.call( this , theme , defaultTheme ) ;

	if ( this.next ) {
		let nextImage = this.babylon.nextImage = new BABYLON.GUI.Image( 'message-next' , '/icons/dialog-next.png' ) ;
		nextImage.width = "30px" ;
		nextImage.height = "15px" ;
		nextImage.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM ;
		nextImage.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT ;
		nextImage.isVisible = false ;
		this.babylon.containerRect.addControl( nextImage ) ;
	}

	// Slow-typing: don't write characters ATM
	if ( this.slowTyping ) { this.babylon.structuredTextBlock.characterLimit = 0 ; }
} ;



// A penalty applied to repeated punctuation
const SAME_SPECIAL_CHARACTER_PAUSE_RATE = 0.5 ;

const SPECIAL_CHARACTER_PAUSE_RATE = {
	' ': 0.3 ,
	',': 1 ,
	':': 1 ,
	';': 1.5 ,
	'.': 2 ,
	'!': 2 ,
	'?': 2.5 ,
	'…': 4 ,
	'\n': 4
} ;

const TYPING_TIMEOUT = {
	normal: { base: 30 , special: 180 , increment: 1 } ,
	fast: { base: 20 , special: 150 , increment: 1 } ,
	faster: { base: 20 , special: 80 , increment: 2 }
} ;



Message.prototype.slowType = async function() {
	var limit , character ,
		clicked = false ,
		//typingSpeed = 'normal' ,
		typingSpeed = 'faster' ,
		baseTimeout = TYPING_TIMEOUT[ typingSpeed ].base ,
		specialBaseTimeout = TYPING_TIMEOUT[ typingSpeed ].special ,
		increment = TYPING_TIMEOUT[ typingSpeed ].increment ,
		structuredTextBlock = this.babylon.structuredTextBlock ;

	this.babylon.containerRect.onPointerClickObservable.addOnce( () => clicked = true ) ;

	await Promise.resolveTimeout( baseTimeout ) ;

	// Don't cache .characterCount because it may change if the dialog is resized because of line-breaks
	for ( limit = 1 ; limit <= structuredTextBlock.characterCount ; limit ++ ) {
		if ( clicked ) {
			structuredTextBlock.characterLimit = structuredTextBlock.characterCount ;
			return ;
		}

		character = this.getNthCharacter( limit - 1 ) ;

		if ( SPECIAL_CHARACTER_PAUSE_RATE[ character ] !== undefined ) {
			// Set the new limit
			structuredTextBlock.characterLimit = limit ;

			let rate = SPECIAL_CHARACTER_PAUSE_RATE[ character ] ;
			// If the next character is the same than this one, cut the rate
			if ( character === this.getNthCharacter( limit ) ) { rate *= SAME_SPECIAL_CHARACTER_PAUSE_RATE ; }
			// Now set the pause
			await Promise.resolveTimeout( specialBaseTimeout * rate ) ;
		}
		else if ( limit >= structuredTextBlock.characterCount ) {
			// Set the new limit
			structuredTextBlock.characterLimit = Infinity ;
			// Now set the pause
			await Promise.resolveTimeout( baseTimeout ) ;
		}
		else if ( limit % increment === 0 ) {
			// Set the new limit
			structuredTextBlock.characterLimit = limit ;
			// Now set the pause
			await Promise.resolveTimeout( baseTimeout ) ;
		}
	}
} ;



Message.prototype.confirm = function() {
	var promise = new Promise() ;

	var	topBase ,
		theme = this.dom.themeConfig?.message?.default ,
		defaultTheme = THEME.default ,
		nextImage = this.babylon.nextImage ,
		t0 = Date.now() ;

	nextImage.isVisible = true ;
	nextImage.topInPixels = topBase = nextImage.topInPixels - Math.round( ( theme?.panel?.padding?.top ?? defaultTheme?.panel?.padding?.top ?? 0 ) / 2 ) ;
	nextImage.leftInPixels = nextImage.leftInPixels - ( theme?.panel?.padding?.left ?? defaultTheme?.panel?.padding?.left ?? 0 ) ;

	var timer = setInterval( () => {
		var delta = ( Date.now() - t0 ) / 1000 ;
		nextImage.topInPixels = topBase - Math.abs( Math.sin( 3 * delta ) * 10 ) ;
	} , 20 ) ;

	var done = () => {
		clearInterval( timer ) ;
		this.gScene.controller.off( 'command' , onCommand ) ;
		promise.resolve() ;
	} ;

	var onCommand = command => {
		if ( command === 'confirm' ) {
			this.gScene.setNavigationByKey( true ) ;
			done() ;
		}
	} ;

	this.gScene.controller.on( 'command' , onCommand ) ;

	this.babylon.containerRect.onPointerClickObservable.addOnce( () => {
		this.gScene.setNavigationByKey( false ) ;
		done() ;
	} ) ;

	return promise ;
} ;

