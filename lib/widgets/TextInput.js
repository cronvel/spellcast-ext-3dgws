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



const TextBox = require( './TextBox.js' ) ;
const misc = require( '../misc.js' ) ;

const extension = require( '../browser-extension.js' ) ;

const deepExtend = require( 'tree-kit/lib/extend.js' ).bind( null , { deep: true } ) ;
const Promise = require( 'seventh' ) ;



function TextInput( dom , gScene , options = {} , parent = null ) {
	TextBox.call( this , dom , gScene , options.label , options , parent ) ;
	
	this.input = options.placeholder || '' ;
	//this.type = options.type ;

	this.babylon.inputText = null ;
	this.babylon.containerStack = null ;
}

TextInput.prototype = Object.create( TextBox.prototype ) ;
TextInput.prototype.constructor = TextInput ;

module.exports = TextInput ;



TextInput.prototype.destroy = function() {
	TextBox.prototype.destroy.call( this ) ;
	if ( this.babylon.inputText ) { this.babylon.inputText.dispose() ; }
} ;



// Should be redefined
TextInput.prototype.run = async function() {
	if ( ! this.guiCreated ) { this.createGUI() ; }
	
	var promise = new Promise() ;
	
	this.babylon.inputText.onKeyboardEventProcessedObservable.add( event => {
		if ( event.key === 'Enter' ) { promise.resolve() ; }
	} ) ;
	//this.babylon.inputText.onBlurObservable.addOnce( () => promise.resolve() ) ;
	await promise ;

	var input = this.babylon.inputText.text ;
	
	this.destroy() ;
	return input ;
} ;



const THEME = TextInput.THEME = deepExtend( {} , TextBox.THEME , {
	default: {
		textInput: {
			labelMargin: "10px" ,	// margin between the label and the input
			color: "white"
		}
	}
} ) ;



TextInput.prototype.createGUI = function( theme , defaultTheme = THEME.default ) {
	if ( this.guiCreated ) { return ; }
	
	// Create the stack now, TextBox should be aware of it to put the text inside the stack instead of the rect
	var stack = this.babylon.containerStack = new BABYLON.GUI.StackPanel() ;

	TextBox.prototype.createGUI.call( this , theme , defaultTheme ) ;

	// /!\ Should used the computed size later
	// This is needed for the stackPanel to work, it cannot figure it out all by itself... :/
	if ( this.babylon.structuredTextBlock ) {
		this.babylon.structuredTextBlock.height = misc.scaleSizeString( this.babylon.structuredTextBlock.fontSize , 2 ) ;
	}

	// Create and configure the stack
	stack.isVertical = true ;
	// /!\ Looks like there is a bug with spacing, if defined in pixel, the children are not drawn... (Babylonjs 5 alpha, 18/01/2022)
	//stack.spacing = theme?.textInput?.labelMargin ?? defaultTheme?.textInput?.labelMargin ?? 0 ;
	stack.spacing = parseInt( theme?.textInput?.labelMargin ?? defaultTheme?.textInput?.labelMargin ?? 0 ) ;

	this.babylon.containerRect.addControl( stack ) ;
	
	
	// Create Babylon's "InputText"
	var inputText = this.babylon.inputText = new BABYLON.GUI.InputText( 'inputText' ) ;

	// Padding, priority: theme, nine-patch slice, default theme or 0
	inputText.paddingLeft = theme?.panel?.padding?.left ?? this.paddingLeft ?? defaultTheme?.panel?.padding?.left ?? 0 ;
	inputText.paddingTop = theme?.panel?.padding?.top ?? this.paddingTop ?? defaultTheme?.panel?.padding?.top ?? 0 ;
	inputText.paddingRight = theme?.panel?.padding?.right ?? this.paddingRight ?? defaultTheme?.panel?.padding?.right ?? 0 ;
	inputText.paddingBottom = theme?.panel?.padding?.bottom ?? this.paddingBottom ?? defaultTheme?.panel?.padding?.bottom ?? 0 ;

	//inputText.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM ;
	inputText.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT ;

	inputText.fontSize = theme?.textInput?.fontSize ?? defaultTheme?.textInput?.fontSize ?? "14px" ;
	inputText.color = theme?.textInput?.color ?? defaultTheme?.textInput?.color ;
	inputText.outlineWidth = theme?.textInput?.outlineWidth ?? defaultTheme?.textInput?.outlineWidth ?? 0 ;
	inputText.outlineColor = theme?.textInput?.outlineColor ?? defaultTheme?.textInput?.outlineColor ?? null ;
	inputText.background = theme?.textInput?.backgroundColor ?? defaultTheme?.textInput?.backgroundColor ?? this.containerRectStyle.backgroundColor ;

	//inputText.textWrapping = true ;
	//inputText.textWrapping = BABYLON.GUI.TextWrapping.Clip ;
	//inputText.textWrapping = BABYLON.GUI.TextWrapping.Ellipsis ;
	inputText.textWrapping = BABYLON.GUI.TextWrapping.WordWrap ;

	//inputText.color = this.special.content.textColor ;
	//inputText.alpha = this.opacity ;
	//inputText.resizeToFit = true ;
	//inputText.isPointerBlocker = false ;
	
	inputText.width = 0.8 ;
	inputText.maxWidth = 0.8 ;
	inputText.height = misc.scaleSizeString( inputText.fontSize , 2.618 ) ;
	//inputText.text = "placeholder";
	//inputText.color = "white";
	//inputText.background = "green";

	stack.addControl( inputText ) ;
} ;

