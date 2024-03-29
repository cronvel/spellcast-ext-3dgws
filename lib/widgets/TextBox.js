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



const Box = require( './Box.js' ) ;
const textFx = require( './textFx.js' ) ;

const misc = require( '../misc.js' ) ;
const extension = require( '../browser-extension.js' ) ;

const deepExtend = require( 'tree-kit/lib/extend.js' ).bind( null , { deep: true } ) ;
const Promise = require( 'seventh' ) ;



function TextBox( dom , gScene , text , options = {} , parent = null ) {
	Box.call( this , dom , gScene , options , parent ) ;

	this.text = text ;
	//this.type = options.type ;

	this.fxTextParts = [] ;
	this.fxUpdateCount = 0 ;
	this.isFxInit = false ;
	this.updateFx = this.updateFx.bind( this ) ;	// Used as an event listener, so bind it

	this.babylon.structuredTextBlock = null ;
}

TextBox.prototype = Object.create( Box.prototype ) ;
TextBox.prototype.constructor = TextBox ;

module.exports = TextBox ;



TextBox.prototype.destroy = function() {
	Box.prototype.destroy.call( this ) ;
	if ( this.babylon.structuredTextBlock ) { this.babylon.structuredTextBlock.dispose() ; }
	this.gScene.off( 'render' , this.updateFx ) ;
} ;



// Should be redefined
TextBox.prototype.run = function() {
	if ( ! this.guiCreated ) { this.createGUI() ; }
	this.destroy() ;
} ;



const THEME = TextBox.THEME = deepExtend( {} , Box.THEME , {
	default: {
		text: {
			color: "white"
		}
	}
} ) ;



TextBox.prototype.createGUI = function( theme , defaultTheme = THEME.default ) {
	if ( this.guiCreated ) { return ; }

	Box.prototype.createGUI.call( this , theme , defaultTheme ) ;

	// TextInput is derived from TextBox, but it does not always feature an input label
	if ( ! this.text ) { return ; }

	// The container is the containerRect, except if there is a containerStack defined
	var container = this.babylon.containerStack || this.babylon.containerRect ;

	var structuredTextBlock = this.babylon.structuredTextBlock = new BABYLON.GUI.StructuredTextBlock( 'structuredTextBlock' ) ;

	// Padding, priority: theme, default theme, nine-patch slice
	structuredTextBlock.paddingLeft = theme?.panel?.padding?.left ?? defaultTheme?.panel?.padding?.left ?? this.paddingLeft ;
	structuredTextBlock.paddingTop = theme?.panel?.padding?.top ?? defaultTheme?.panel?.padding?.top ?? this.paddingTop ;
	structuredTextBlock.paddingRight = theme?.panel?.padding?.right ?? defaultTheme?.panel?.padding?.right ?? this.paddingRight ;
	structuredTextBlock.paddingBottom = theme?.panel?.padding?.bottom ?? defaultTheme?.panel?.padding?.bottom ?? this.paddingBottom ;
	//structuredTextBlock.paddingLeft = structuredTextBlock.paddingTop = structuredTextBlock.paddingRight = structuredTextBlock.paddingBottom = "16px" ;
	//structuredTextBlock.paddingLeft = structuredTextBlock.paddingRight = "16px" ;

	//structuredTextBlock.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM ;
	structuredTextBlock.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT ;

	structuredTextBlock.fontSize = theme?.text?.fontSize ?? defaultTheme?.text?.fontSize ?? "14px" ;
	structuredTextBlock.color = theme?.text?.color ?? defaultTheme?.text?.color ;
	structuredTextBlock.outlineWidth = theme?.text?.outlineWidth ?? defaultTheme?.text?.outlineWidth ?? 0 ;
	structuredTextBlock.outlineColor = theme?.text?.outlineColor ?? defaultTheme?.text?.outlineColor ?? null ;
	structuredTextBlock.structuredText = this.parseText( this.text ) ;

	structuredTextBlock.onLinesReadyObservable.addOnce( () => {
		this.fxTextParts.length = 0 ;

		for ( let line of structuredTextBlock.lines ) {
			for ( let part of line.parts ) {
				// Some FX may not update (e.g. a rainbow effect would only need an init method)
				if ( part.staticCustomData?.fx && textFx[ part.staticCustomData.fx ].update ) {
					this.fxTextParts.push( part ) ;
				}
			}
		}

		if ( this.fxTextParts.length ) {
			this.gScene.on( 'render' , this.updateFx ) ;
		}
	} ) ;


	//structuredTextBlock.textWrapping = true ;
	//structuredTextBlock.textWrapping = BABYLON.GUI.TextWrapping.Clip ;
	//structuredTextBlock.textWrapping = BABYLON.GUI.TextWrapping.Ellipsis ;
	structuredTextBlock.textWrapping = BABYLON.GUI.TextWrapping.WordWrap ;

	//structuredTextBlock.color = this.special.content.textColor ;
	//structuredTextBlock.alpha = this.opacity ;
	//structuredTextBlock.resizeToFit = true ;
	//structuredTextBlock.isPointerBlocker = false ;

	container.addControl( structuredTextBlock ) ;
} ;



TextBox.prototype.updateFx = function() {
	var fx ,
		index = 0 ,
		updated = false ;

	if ( ! this.isFxInit ) {
		for ( let part of this.fxTextParts ) {
			fx = textFx[ part.staticCustomData.fx ] ;

			if ( fx.initDynamic ) {
				part.dynamicCustomData = {} ;
				fx.initDynamic( part , this , this.babylon.structuredTextBlock ) ;
			}
		}

		this.isFxInit = true ;
	}

	for ( let part of this.fxTextParts ) {
		fx = textFx[ part.staticCustomData.fx ] ;

		if ( ! fx.updateEvery || this.fxUpdateCount % fx.updateEvery === 0 ) {
			fx.update( part , this , this.babylon.structuredTextBlock , index ) ;
			updated = true ;
		}

		index ++ ;
	}

	this.fxUpdateCount ++ ;

	if ( updated ) { this.babylon.structuredTextBlock._markAsDirty() ; }
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

		if ( input.fx && textFx[ input.fx ] ) {
			part.staticCustomData = { fx: input.fx } ;

			if ( textFx[ input.fx ].initStatic ) {
				textFx[ input.fx ].initStatic( part , this ) ;
			}
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

