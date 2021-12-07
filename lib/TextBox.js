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



function TextBox( dom , gScene , text , options = {} ) {
	this.gScene = gScene ;
	this.dom = dom ;    // Dom instance, immutable

	this.text = text ;
	//this.type = options.type ;

	this.babylon = {
		mainControl: null ,
		rectangle: null ,
		structuredTextBlock: null ,
		boxImage: null
	} ;
}

module.exports = TextBox ;



TextBox.prototype.destroy = function() {
	if ( this.babylon.rectangle ) { this.babylon.rectangle.dispose() ; }
	if ( this.babylon.structuredTextBlock ) { this.babylon.structuredTextBlock.dispose() ; }
	if ( this.babylon.boxImage ) { this.babylon.boxImage.dispose() ; }
	this.babylon.mainControl = null ;
} ;



// Should be redefined
TextBox.prototype.run = async function() {
	this.createGUI() ;
	this.destroy() ;
} ;



const THEME = {} ;

THEME.default = {
	panel: {
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
} ;



TextBox.prototype.setControlAlignment = function( control , type ) {
	switch ( type ) {
		case 'top' :
			control.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER ;
			control.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP ;
			break ;
		case 'bottom' :
			control.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER ;
			control.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM ;
			break ;
		case 'left' :
			control.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT ;
			control.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER ;
			break ;
		case 'right' :
			control.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT ;
			control.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER ;
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



TextBox.prototype.createGUI = function( theme , defaultTheme = THEME.default ) {
	var rectangle , boxImage , structuredTextBlock ,
		paddingLeft , paddingTop , paddingRight , paddingBottom ,
		ui = this.gScene.getUi() ;

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
		boxImage = this.babylon.boxImage = new BABYLON.GUI.Image( 'message-background' , theme?.panel?.ninePatchImage?.url ?? defaultTheme?.panel?.ninePatchImage?.url ) ;
		//boxImage.width = "200px";
		//boxImage.height = "300px";
		boxImage.stretch = BABYLON.GUI.Image.STRETCH_NINE_PATCH ;

		// /!\ boxImage.width and boxImage.height are undefined, until the image is loaded!!!
		// /!\ This will produce bug!
		boxImage.sliceLeft = paddingLeft = theme?.panel?.ninePatchImage?.sliceLeft ?? defaultTheme?.panel?.ninePatchImage?.sliceLeft ?? 0 ;
		boxImage.sliceTop = paddingTop = theme?.panel?.ninePatchImage?.sliceTop ?? defaultTheme?.panel?.ninePatchImage?.sliceTop ?? 0 ;
		boxImage.sliceRight = theme?.panel?.ninePatchImage?.sliceRight ?? defaultTheme?.panel?.ninePatchImage?.sliceRight ?? boxImage.width ;
		boxImage.sliceBottom = theme?.panel?.ninePatchImage?.sliceBottom ?? defaultTheme?.panel?.ninePatchImage?.sliceBottom ?? boxImage.height ;

		// /!\ TMP, due to previous bug
		paddingRight = paddingLeft ;
		paddingBottom = paddingTop ;

		rectangle.addControl( boxImage ) ;
	}
	else {
		rectangle.cornerRadius = theme?.panel?.cornerRadius ?? defaultTheme?.panel?.cornerRadius ;
		rectangle.color = theme?.panel?.borderColor ?? defaultTheme?.panel?.borderColor ;
		rectangle.thickness = theme?.panel?.borderWidth ?? defaultTheme?.panel?.borderWidth ;
		rectangle.background = theme?.panel?.backgroundColor ?? defaultTheme?.panel?.backgroundColor ;
	}

	structuredTextBlock = this.babylon.structuredTextBlock = new BABYLON.GUI.StructuredTextBlock() ;

	// Padding, priority: theme, nine-patch slice, default theme or 0
	structuredTextBlock.paddingLeft = theme?.panel?.padding?.left ?? paddingLeft ?? defaultTheme?.panel?.padding?.left ?? 0 ;
	structuredTextBlock.paddingTop = theme?.panel?.padding?.top ?? paddingTop ?? defaultTheme?.panel?.padding?.top ?? 0 ;
	structuredTextBlock.paddingRight = theme?.panel?.padding?.right ?? paddingRight ?? defaultTheme?.panel?.padding?.right ?? 0 ;
	structuredTextBlock.paddingBottom = theme?.panel?.padding?.bottom ?? paddingBottom ?? defaultTheme?.panel?.padding?.bottom ?? 0 ;
	
	/*
	// Not defined in time (because width is not in pixels but is a rate)
	if ( paddingLeft + paddingRight > rectangle.widthInPixels / 2 ) {
		paddingLeft = paddingRight = Math.round( rectangle.widthInPixels / 4 ) ;
	}
	if ( paddingTop + paddingBottom > rectangle.heightInPixels / 2 ) {
		paddingTop = paddingBottom = Math.round( rectangle.heightInPixels / 4 ) ;
	}
	*/

	console.warn( "+++++++++++++++ PADDING:" , structuredTextBlock.paddingLeft , structuredTextBlock.paddingTop , structuredTextBlock.paddingRight , structuredTextBlock.paddingBottom ) ;

	//structuredTextBlock.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM ;
	structuredTextBlock.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT ;

	structuredTextBlock.fontSize = theme?.text?.fontSize ?? defaultTheme?.text?.fontSize ?? "14px" ;
	structuredTextBlock.color = theme?.text?.color ?? defaultTheme?.text?.color ;
	structuredTextBlock.outlineWidth = theme?.text?.outlineWidth ?? defaultTheme?.text?.outlineWidth ?? 0 ;
	structuredTextBlock.outlineColor = theme?.text?.outlineColor ?? defaultTheme?.text?.outlineColor ?? null ;
	structuredTextBlock.structuredText = this.parseText( this.text ) ;
	//structuredTextBlock.structuredText = [ { text: "one two three " } , { text: "four" , color: "red" } , { text: " five" , color: "#eeaa55" } ] ;

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
	black: '#000000' ,
	brightBlack: '#555753' , //grey: '#555753',
	red: '#cc0000' ,
	brightRed: '#ef2929' ,
	green: '#4e9a06' ,
	brightGreen: '#8ae234' ,
	yellow: '#c4a000' ,
	brightYellow: '#fce94f' ,
	blue: '#3465a4' ,
	brightBlue: '#729fcf' ,
	magenta: '#75507b' ,
	brightMagenta: '#ad7fa8' ,
	cyan: '#06989a' ,
	brightCyan: '#34e2e2' ,
	white: '#d3d7cf' ,
	brightWhite: '#eeeeec'
} ;

MARKUP_COLOR_CODE.grey = MARKUP_COLOR_CODE.gray = MARKUP_COLOR_CODE.brightBlack ;



TextBox.prototype.parseText = function( text ) {
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



TextBox.prototype.getNthCharacter = function( index ) {
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

