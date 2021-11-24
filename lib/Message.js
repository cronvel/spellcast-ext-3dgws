/*
	3D Ground With Sprites

	Copyright (c) 2020 - 2021 Cédric Ronvel

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



const misc = require( './misc.js' ) ;

const extension = require( './browser-extension.js' ) ;
const Promise = require( 'seventh' ) ;



function Message( dom , gScene , text , options = {} ) {
	this.gScene = gScene ;
	this.dom = dom ;    // Dom instance, immutable

	this.text = text ;
	this.type = options.type ;
	this.wait = options.wait || 0 ;
	this.slowTyping = !! options.slowTyping ;
	this.next = !! options.next ;

	this.babylon = {
		rectangle: null ,
		image: null ,
		structuredTextBlock: null
	} ;
}

//Message.prototype = Object.create( GEntityFloatingText.prototype ) ;
//Message.prototype.constructor = Message ;

module.exports = Message ;



Message.prototype.destroy = function() {
	if ( this.babylon.structuredTextBlock ) { this.babylon.structuredTextBlock.dispose() ; }
	if ( this.babylon.rectangle ) { this.babylon.rectangle.dispose() ; }
	if ( this.babylon.image ) { this.babylon.image.dispose() ; }
} ;



const THEME = {} ;

THEME.default = {
	panel: {
		backgroundColor: "green" ,
		borderColor: "orange" ,
		borderWidth: 4 ,
		cornerRadius: 20
	} ,
	text: {
		color: "white" ,
		padding: "10px"
	}
} ;



Message.prototype.setControlAlignment = function( control , type ) {
	switch ( type ) {
		case 'top' :
			control.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP ;
			break ;
		case 'bottom' :
			control.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM ;
			break ;
		case 'left' :
			control.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT ;
			break ;
		case 'right' :
			control.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT ;
			break ;
		case 'top-left' :
			control.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP ;
			control.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT ;
			break ;
		case 'top-right' :
			control.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP ;
			control.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT ;
			break ;
		case 'bottom-left' :
			control.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM ;
			control.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT ;
			break ;
		case 'bottom-right' :
			control.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM ;
			control.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT ;
			break ;
		case 'center' :
		default :
			control.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER ;
			control.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER ;
			break ;
	}
} ;



Message.prototype.create = function() {
	var rectangle , image , structuredTextBlock ,
		ui = this.gScene.getUi() ,
		theme = this.dom.themeConfig?.message?.default ,
		defaultTheme = THEME.default ;

	rectangle = this.babylon.rectangle = new BABYLON.GUI.Rectangle() ;
	rectangle.width = 0.5 ;
	rectangle.height = "160px" ;
	rectangle.thickness = 0 ;

	if ( theme?.position ?? defaultTheme?.position ) {
		this.setControlAlignment( rectangle , theme?.position ?? defaultTheme?.position ) ;
	}

	ui.addControl( rectangle ) ;

	console.warn( "THEME:" , theme , theme?.panel?.ninePatchImage?.url ?? defaultTheme?.panel?.ninePatchImage?.url ) ;
	//if ( false ) {
	if ( theme?.panel?.ninePatchImage?.url ?? defaultTheme?.panel?.ninePatchImage?.url ) {
		image = this.babylon.image = new BABYLON.GUI.Image( 'message-background' , theme?.panel?.ninePatchImage?.url ?? defaultTheme?.panel?.ninePatchImage?.url ) ;
		//image.width = "200px";
		//image.height = "300px";
		image.stretch = BABYLON.GUI.Image.STRETCH_NINE_PATCH ;
		image.sliceLeft = theme?.panel?.ninePatchImage?.sliceLeft ?? defaultTheme?.panel?.ninePatchImage?.sliceLeft ?? 0 ;
		image.sliceTop = theme?.panel?.ninePatchImage?.sliceTop ?? defaultTheme?.panel?.ninePatchImage?.sliceTop ?? 0 ;
		image.sliceRight = theme?.panel?.ninePatchImage?.sliceRight ?? defaultTheme?.panel?.ninePatchImage?.sliceRight ?? image.width ;
		image.sliceBottom = theme?.panel?.ninePatchImage?.sliceBottom ?? defaultTheme?.panel?.ninePatchImage?.sliceBottom ?? image.height ;

		rectangle.addControl( image ) ;
	}
	else {
		rectangle.cornerRadius = theme?.panel?.cornerRadius ?? defaultTheme?.panel?.cornerRadius ;
		rectangle.color = theme?.panel?.borderColor ?? defaultTheme?.panel?.borderColor ;
		rectangle.thickness = theme?.panel?.borderWidth ?? defaultTheme?.panel?.borderWidth ;
		rectangle.background = theme?.panel?.backgroundColor ?? defaultTheme?.panel?.backgroundColor ;
	}

	structuredTextBlock = this.babylon.structuredTextBlock = new BABYLON.GUI.StructuredTextBlock() ;
	//structuredTextBlock.height = "50px" ;
	structuredTextBlock.structuredText = this.parseText( this.text ) ;
	//structuredTextBlock.structuredText = [ { text: "one two three " } , { text: "four" , color: "red" } , { text: " five" , color: "#eeaa55" } ] ;
	structuredTextBlock.fontSize = theme?.text?.fontSize ?? defaultTheme?.text?.fontSize ?? "14px" ;
	structuredTextBlock.color = theme?.text?.color ?? defaultTheme?.text?.color ;
	structuredTextBlock.outlineWidth = theme?.text?.outlineWidth ?? defaultTheme?.text?.outlineWidth ?? 0 ;
	structuredTextBlock.outlineColor = theme?.text?.outlineColor ?? defaultTheme?.text?.outlineColor ?? null ;

	// Slow-typing: don't write characters ATM
	if ( this.slowTyping ) { structuredTextBlock.characterLimit = 0 ; }

	if ( theme?.text?.padding ?? defaultTheme?.text?.padding ) {
		structuredTextBlock.paddingLeft = structuredTextBlock.paddingRight = structuredTextBlock.paddingTop = structuredTextBlock.paddingBottom = theme?.text?.padding ?? defaultTheme?.text?.padding ;
	}

	//structuredTextBlock.textWrapping = true ;
	//structuredTextBlock.textWrapping = BABYLON.GUI.TextWrapping.Clip ;
	//structuredTextBlock.textWrapping = BABYLON.GUI.TextWrapping.Ellipsis ;
	structuredTextBlock.textWrapping = BABYLON.GUI.TextWrapping.WordWrap ;

	//structuredTextBlock.color = this.special.content.textColor ;
	//structuredTextBlock.alpha = this.opacity ;
	//structuredTextBlock.resizeToFit = true ;
	rectangle.addControl( structuredTextBlock ) ;
	
	// The mainControl will be the control where events are tested
	this.babylon.mainControl = rectangle ;

	// Needed for rectangle.onPointerClickObservable
	this.babylon.mainControl.isPointerBlocker = true ;
} ;



const MARKUP_COLOR_CODE = {
	black: '#000000',
	brightBlack: '#555753', //grey: '#555753',
	red: '#cc0000',
	brightRed: '#ef2929',
	green: '#4e9a06',
	brightGreen: '#8ae234',
	yellow: '#c4a000',
	brightYellow: '#fce94f',
	blue: '#3465a4',
	brightBlue: '#729fcf',
	magenta: '#75507b',
	brightMagenta: '#ad7fa8',
	cyan: '#06989a',
	brightCyan: '#34e2e2',
	white: '#d3d7cf',
	brightWhite: '#eeeeec'
} ;

MARKUP_COLOR_CODE.grey = MARKUP_COLOR_CODE.gray = MARKUP_COLOR_CODE.brightBlack ;



Message.prototype.parseText = function( text ) {
	return extension.host.exports.toolkit.parseMarkup( text ).map( input => {
		var part = { text: input.text } ;
		
		if ( input.color ) {
			part.color = input.color[ 0 ] === '#' ? input.color : MARKUP_COLOR_CODE[ input.color ] ;
		}

		if ( input.italic ) { part.fontStyle = 'italic' ; }
		if ( input.bold ) { part.fontWeight = 'bold' ; }
		if ( input.underline ) { part.underline = true ; }
		if ( input.strike ) { part.lineThrough = true ; }
		
		if ( input.bgColor ) {
			part.frame = true ;
			part.frameColor = input.bgColor ;
			part.frameOutlineWidth = 2 ;
			part.frameOutlineColor = misc.getContrastColorCode( part.frameColor , 0.7 ) ;
			part.frameCornerRadius = 5 ;
		}
		
		return part ;
	} ) ;
} ;



Message.prototype.getNthCharacter = function( index ) {
	var part , line ,
		structuredTextBlock = this.babylon.structuredTextBlock ,
		lines = structuredTextBlock.lines ,
        count = structuredTextBlock.characterCount ;
	
	if ( index > count ) { return '' ; }

	for ( line of lines ) {
		for ( part of line.parts ) {
			if ( index < part.text.length ) { return part.text[ index ] ; }
			index -= part.text.length ;
		}
	}
	
	return '' ;
} ;



// A penalty applied to repeated punctuation
const SAME_SPECIAL_CHARACTER_PAUSE_RATE = 0.5 ;

const SPECIAL_CHARACTER_PAUSE_RATE = {
	' ': 0.3 ,
	',': 1,
	':': 1 ,
	';': 1.5 ,
	'.': 2 ,
	'!': 2 ,
	'?': 2.5 ,
	'…': 4 ,
	'\n': 4
} ;



Message.prototype.slowType = async function() {
	var limit , character , rate ,
		clicked = false ,
		baseTimeout = 30 ,
		specialBaseTimeout = 180 ,
		structuredTextBlock = this.babylon.structuredTextBlock ,
		count = structuredTextBlock.characterCount ;

	this.babylon.mainControl.onPointerClickObservable.addOnce( () => clicked = true ) ;

	await Promise.resolveTimeout( baseTimeout ) ;

	for ( limit = 1 ; limit < count ; limit ++ ) {
		if ( clicked ) {
			structuredTextBlock.characterLimit = count ;
			return ;
		}

		// Set the new limit
		structuredTextBlock.characterLimit = limit ;
		
		// Now set the pause
		character = this.getNthCharacter( limit - 1 ) ;
		rate = 1 ;

		if ( SPECIAL_CHARACTER_PAUSE_RATE[ character ] !== undefined ) {
			rate = SPECIAL_CHARACTER_PAUSE_RATE[ character ] ;
			// If the next character is the same than this one, cut the rate
			if ( character === this.getNthCharacter( limit ) ) { rate *= SAME_SPECIAL_CHARACTER_PAUSE_RATE ; }
			await Promise.resolveTimeout( specialBaseTimeout * rate ) ;
		}
		else {
			await Promise.resolveTimeout( baseTimeout * rate ) ;
		}
	}
} ;



Message.prototype.confirm = function() {
	var promise = new Promise() ;
	this.babylon.mainControl.onPointerClickObservable.addOnce( () => promise.resolve() ) ;
	return promise ;
} ;



Message.prototype.run = async function() {
	this.create() ;

	if ( this.slowTyping ) { await this.slowType() ; }
	if ( this.next ) { await this.confirm() ; }
	if ( this.wait ) { await Promise.resolveTimeout( this.wait * 1000 ) ; }

	this.destroy() ;
} ;

