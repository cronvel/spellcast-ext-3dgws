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



const extension = require( './browser-extension.js' ) ;
const Promise = require( 'seventh' ) ;



function Message( dom , gScene , text , options = {} ) {
	this.gScene = gScene ;
	this.dom = dom ;    // Dom instance, immutable

	this.text = text ;
	this.options = options ;

	this.babylon = {
		rectangle: null ,
		image: null ,
		textBlock: null
	} ;
}

//Message.prototype = Object.create( GEntityFloatingText.prototype ) ;
//Message.prototype.constructor = Message ;

module.exports = Message ;



Message.prototype.destroy = function() {
	if ( this.babylon.textBlock ) { this.babylon.textBlock.dispose() ; }
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

/*
	New TextBlock tests:
	https://playground.babylonjs.com/#G5H9IN#74
	https://harlequin-silkworm-ygwlmhhr.ws-eu17.gitpod.io/
*/

Message.prototype.create = function() {
	var rectangle , image , textBlock ,
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

	textBlock = this.babylon.textBlock = new BABYLON.GUI.TextBlock() ;
	//textBlock.height = "50px" ;
	textBlock.text = this.parseText( this.text ) ;
	//textBlock.text = [ { text: "one two three " } , { text: "four" , color: "red" } , { text: " five" , color: "#eeaa55" } ] ;
	textBlock.fontSize = theme?.text?.fontSize ?? defaultTheme?.text?.fontSize ?? "14px" ;
	textBlock.color = theme?.text?.color ?? defaultTheme?.text?.color ;
	textBlock.outlineWidth = theme?.text?.outlineWidth ?? defaultTheme?.text?.outlineWidth ?? 0 ;
	textBlock.outlineColor = theme?.text?.outlineColor ?? defaultTheme?.text?.outlineColor ?? null ;

	if ( theme?.text?.padding ?? defaultTheme?.text?.padding ) {
		textBlock.paddingLeft = textBlock.paddingRight = textBlock.paddingTop = textBlock.paddingBottom = theme?.text?.padding ?? defaultTheme?.text?.padding ;
	}

	textBlock.textWrapping = true ;

	//textBlock.color = this.special.content.textColor ;
	//textBlock.alpha = this.opacity ;
	//textBlock.resizeToFit = true ;
	rectangle.addControl( textBlock ) ;
} ;



const MARKUP_COLOR_TO_CSS = {
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

MARKUP_COLOR_TO_CSS.grey = MARKUP_COLOR_TO_CSS.gray = MARKUP_COLOR_TO_CSS.brightBlack ;



Message.prototype.parseText = function( text ) {
	return extension.host.exports.toolkit.parseMarkup( text ).map( _part => {
		var part = { text: _part.text } ;
		part.color = MARKUP_COLOR_TO_CSS[ _part.color ] ;
		return part ;
	} ) ;
} ;



Message.prototype.confirm = function() {
	return Promise.resolveTimeout( 20000 ) ;
} ;



Message.prototype.run = async function() {
	this.create() ;
	await this.confirm() ;
	this.destroy() ;
} ;

