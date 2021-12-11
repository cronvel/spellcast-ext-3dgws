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

const misc = require( '../misc.js' ) ;
const extension = require( '../browser-extension.js' ) ;

const deepExtend = require( 'tree-kit/lib/extend.js' ).bind( null , { deep: true } ) ;
const Promise = require( 'seventh' ) ;



function TextInput( dom , gScene , options = {} , parent = null ) {
	Box.call( this , dom , gScene , options , parent ) ;
	
	this.text = options.placeholder || '' ;
	//this.type = options.type ;

	this.babylon.inputText = null ;
}

TextInput.prototype = Object.create( Box.prototype ) ;
TextInput.prototype.constructor = TextInput ;

module.exports = TextInput ;



TextInput.prototype.destroy = function() {
	Box.prototype.destroy.call( this ) ;
	if ( this.babylon.inputText ) { this.babylon.inputText.dispose() ; }
} ;



// Should be redefined
TextInput.prototype.run = function() {
	if ( ! this.guiCreated ) { this.createGUI() ; }
	this.destroy() ;
} ;



const THEME = TextInput.THEME = deepExtend( {} , Box.THEME , {
	default: {
		textInput: {
			color: "white"
		}
	}
} ) ;



TextInput.prototype.createGUI = function( theme , defaultTheme = THEME.default ) {
	if ( this.guiCreated ) { return ; }
	
	Box.prototype.createGUI.call( this , theme , defaultTheme ) ;

	var inputText = this.babylon.inputText = new BABYLON.GUI.InputText( 'inputText' ) ;

	// Padding, priority: theme, nine-patch slice, default theme or 0
	inputText.paddingLeft = theme?.panel?.padding?.left ?? this.paddingLeft ?? defaultTheme?.panel?.padding?.left ?? 0 ;
	inputText.paddingTop = theme?.panel?.padding?.top ?? this.paddingTop ?? defaultTheme?.panel?.padding?.top ?? 0 ;
	inputText.paddingRight = theme?.panel?.padding?.right ?? this.paddingRight ?? defaultTheme?.panel?.padding?.right ?? 0 ;
	inputText.paddingBottom = theme?.panel?.padding?.bottom ?? this.paddingBottom ?? defaultTheme?.panel?.padding?.bottom ?? 0 ;

	//inputText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM ;
	inputText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT ;

	inputText.fontSize = theme?.textInput?.fontSize ?? defaultTheme?.text?.fontSize ?? "14px" ;
	inputText.color = theme?.textInput?.color ?? defaultTheme?.text?.color ;
	inputText.outlineWidth = theme?.textInput?.outlineWidth ?? defaultTheme?.text?.outlineWidth ?? 0 ;
	inputText.outlineColor = theme?.textInput?.outlineColor ?? defaultTheme?.text?.outlineColor ?? null ;

	//inputText.textWrapping = true ;
	//inputText.textWrapping = BABYLON.GUI.TextWrapping.Clip ;
	//inputText.textWrapping = BABYLON.GUI.TextWrapping.Ellipsis ;
	inputText.textWrapping = BABYLON.GUI.TextWrapping.WordWrap ;

	//inputText.color = this.special.content.textColor ;
	//inputText.alpha = this.opacity ;
	//inputText.resizeToFit = true ;
	//inputText.isPointerBlocker = false ;

	this.babylon.containerRect.addControl( inputText ) ;
} ;

