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



const misc = require( '../misc.js' ) ;
const extension = require( '../browser-extension.js' ) ;

const Promise = require( 'seventh' ) ;



function TextBox( dom , gScene , text , options = {} , parent = null ) {
	this.dom = dom ;    // Dom instance, immutable
	this.gScene = gScene ;
	this.parent = parent ?? this.gScene ;

	this.text = text ;
	//this.type = options.type ;

	this.ninePatchImageUrl = null ;
	this.containerRectStyle = {} ;

	this.guiCreated = false ;

	this.babylon = {
		containerRect: null ,
		structuredTextBlock: null ,
		boxImage: null
	} ;
}

module.exports = TextBox ;



TextBox.prototype.childrenWidthInPixelsRequired = false ;
TextBox.prototype.childrenHeightInPixelsRequired = false ;
TextBox.prototype.childrenMaxWidth = 0 ;
TextBox.prototype.childrenMaxHeight = 0 ;



TextBox.prototype.destroy = function() {
	if ( this.babylon.containerRect ) { this.babylon.containerRect.dispose() ; }
	if ( this.babylon.structuredTextBlock ) { this.babylon.structuredTextBlock.dispose() ; }
	if ( this.babylon.boxImage ) { this.babylon.boxImage.dispose() ; }
} ;



TextBox.prototype.getUi = function() { return this.babylon.containerRect ; } ;



// Should be redefined
TextBox.prototype.run = function() {
	if ( ! this.guiCreated ) { this.createGUI() ; }
	this.destroy() ;
} ;



const THEME = TextBox.THEME = {
	default: {
		position: 'center' ,
		panel: {
			width: 0.5 ,
			height: 0.2 ,
			opacity: 1 ,
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
} ;



TextBox.prototype.createGUI = function( theme , defaultTheme = THEME.default ) {
	if ( this.guiCreated ) { return ; }

	var containerRect , boxImage , structuredTextBlock , width , height ,
		paddingLeft , paddingTop , paddingRight , paddingBottom ;

	width = theme?.panel?.width ?? defaultTheme?.panel?.width ?? 0.5 ;
	height = theme?.panel?.height ?? defaultTheme?.panel?.height ?? 0.2 ;

	console.warn( ".childrenHeightInPixelsRequired:" , this.parent.childrenHeightInPixelsRequired , height ) ;
	if ( this.parent.childrenHeightInPixelsRequired && typeof height === 'number' ) {
		height = ( height * this.parent.childrenMaxHeight ) + 'px' ;
		console.warn( "Set height to:" , height ) ;
	}

	containerRect = this.babylon.containerRect = new BABYLON.GUI.Rectangle( 'containerRect' ) ;
	containerRect.width = this.containerRectStyle.width = width ;
	containerRect.height = this.containerRectStyle.height = height ;
	containerRect.thickness = 0 ;

	this.setControlAlignment( containerRect , theme?.position ?? defaultTheme?.position ) ;

	this.parent.getUi().addControl( containerRect ) ;

	console.warn( "THEME: " , theme , theme?.panel?.ninePatchImage?.url ?? defaultTheme?.panel?.ninePatchImage?.url ) ;

	this.ninePatchImageUrl = theme?.panel?.ninePatchImage?.url ?? defaultTheme?.panel?.ninePatchImage?.url ;

	if ( this.ninePatchImageUrl ) {
		boxImage = this.babylon.boxImage = new BABYLON.GUI.Image( 'boxImage' , this.ninePatchImageUrl ) ;
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

		//boxImage.isPointerBlocker = false ;

		containerRect.addControl( boxImage ) ;
	}
	else {
		this.containerRectStyle.opacity = theme?.panel?.opacity ?? defaultTheme?.panel?.opacity ;
		this.containerRectStyle.backgroundColor = theme?.panel?.backgroundColor ?? defaultTheme?.panel?.backgroundColor ;
		this.containerRectStyle.borderColor = theme?.panel?.borderColor ?? defaultTheme?.panel?.borderColor ;
		this.containerRectStyle.borderWidth = theme?.panel?.borderWidth ?? defaultTheme?.panel?.borderWidth ;
		this.containerRectStyle.cornerRadius = theme?.panel?.cornerRadius ?? defaultTheme?.panel?.cornerRadius ;
		this.applyRectangleStyle( containerRect , this.containerRectStyle ) ;
	}

	structuredTextBlock = this.babylon.structuredTextBlock = new BABYLON.GUI.StructuredTextBlock( 'structuredTextBlock' ) ;

	// Padding, priority: theme, nine-patch slice, default theme or 0
	structuredTextBlock.paddingLeft = theme?.panel?.padding?.left ?? paddingLeft ?? defaultTheme?.panel?.padding?.left ?? 0 ;
	structuredTextBlock.paddingTop = theme?.panel?.padding?.top ?? paddingTop ?? defaultTheme?.panel?.padding?.top ?? 0 ;
	structuredTextBlock.paddingRight = theme?.panel?.padding?.right ?? paddingRight ?? defaultTheme?.panel?.padding?.right ?? 0 ;
	structuredTextBlock.paddingBottom = theme?.panel?.padding?.bottom ?? paddingBottom ?? defaultTheme?.panel?.padding?.bottom ?? 0 ;

	/*
	// Not defined in time (because width is not in pixels but is a rate)
	if ( paddingLeft + paddingRight > containerRect.widthInPixels / 2 ) {
		paddingLeft = paddingRight = Math.round( containerRect.widthInPixels / 4 ) ;
	}
	if ( paddingTop + paddingBottom > containerRect.heightInPixels / 2 ) {
		paddingTop = paddingBottom = Math.round( containerRect.heightInPixels / 4 ) ;
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
	//structuredTextBlock.isPointerBlocker = false ;

	containerRect.addControl( structuredTextBlock ) ;

	// Needed for containerRect.onPointerClickObservable
	this.babylon.containerRect.isPointerBlocker = true ;
	this.guiCreated = true ;
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



TextBox.prototype.applyRectangleStyle = function( rectangle , style ) {
	console.warn( "******** APPLY STYLE" , style ) ;
	if ( style.width !== undefined ) { rectangle.width = style.width ; }
	if ( style.height !== undefined ) { rectangle.height = style.height ; }
	if ( style.opacity !== undefined ) { rectangle.alpha = style.opacity ; }
	if ( style.backgroundColor !== undefined ) { rectangle.background = style.backgroundColor ; }
	if ( style.borderColor !== undefined ) { rectangle.color = style.borderColor ; }
	if ( style.borderWidth !== undefined ) { rectangle.thickness = style.borderWidth ; }
	if ( style.cornerRadius !== undefined ) { rectangle.cornerRadius = style.cornerRadius ; }
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

