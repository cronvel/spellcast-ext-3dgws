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

const extension = require( '../browser-extension.js' ) ;

const deepExtend = require( 'tree-kit/lib/extend.js' ).bind( null , { deep: true } ) ;
const Promise = require( 'seventh' ) ;



function Button( dom , gScene , text , options = {} ) {
	TextBox.call( this , dom , gScene , text , options ) ;

	this.containerRectHoverStyle = {} ;
	this.containerRectPressedDownStyle = {} ;

	this.hoverNinePatchImageUrl = null ;
	this.pressedDownNinePatchImageUrl = null ;

	// The hook to be called when the Button is pressed
	this.onPress = null ;
}

Button.prototype = Object.create( TextBox.prototype ) ;
Button.prototype.constructor = Button ;

module.exports = Button ;



Button.prototype.run = function( onPress ) {
	if ( ! this.guiCreated ) { this.createGUI() ; }
	this.onPress = onPress ;
} ;



const THEME = Button.THEME = deepExtend( {} , TextBox.THEME , {
	default: {
		panel: {
			width: 0.25 ,
			height: 0.2 ,
			opacity: 1 ,
			backgroundColor: "#496ad4" ,
			borderColor: "#496ad4" ,
			borderWidth: 0 ,
			cornerRadius: 4 ,
			padding: {
				left: "10px" ,
				top: "10px" ,
				right: "10px" ,
				bottom: "10px"
			} ,
			hover: {
				//size: 0.95 ,
				opacity: 1 ,
				backgroundColor: "#748dde" ,
				borderColor: "#748dde" ,
				borderWidth: 0
			} ,
			pressedDown: {
				size: 0.95 ,
				opacity: 1 ,
				backgroundColor: "#748dde" ,
				borderColor: "#748dde" ,
				borderWidth: 0
			}
		} ,
		text: {
			color: "white"
		}
	}
} ) ;



Button.prototype.createGUI = function( theme = this.dom.themeConfig?.button?.default , defaultTheme = THEME.default ) {
	if ( this.guiCreated ) { return ; }

	TextBox.prototype.createGUI.call( this , theme , defaultTheme ) ;

	if ( defaultTheme?.panel?.hover ) { deepExtend( this.containerRectHoverStyle , defaultTheme.panel.hover ) ; }
	if ( theme?.panel?.hover ) { deepExtend( this.containerRectHoverStyle , theme.panel.hover ) ; }

	if ( defaultTheme?.panel?.pressedDown ) { deepExtend( this.containerRectPressedDownStyle , defaultTheme.panel.pressedDown ) ; }
	if ( theme?.panel?.pressedDown ) { deepExtend( this.containerRectPressedDownStyle , theme.panel.pressedDown ) ; }

	if ( this.containerRectHoverStyle.size ) {
		this.containerRectHoverStyle.width = this.containerRectStyle.width * this.containerRectHoverStyle.size ;
		this.containerRectHoverStyle.height = this.containerRectStyle.height * this.containerRectHoverStyle.size ;
	}

	if ( this.containerRectPressedDownStyle.size ) {
		this.containerRectPressedDownStyle.width = this.containerRectStyle.width * this.containerRectPressedDownStyle.size ;
		this.containerRectPressedDownStyle.height = this.containerRectStyle.height * this.containerRectPressedDownStyle.size ;
	}

	this.babylon.containerRect.hoverCursor = 'pointer' ;

	this.babylon.containerRect.onPointerEnterObservable.add( () => this.hover() ) ;
	this.babylon.containerRect.onPointerOutObservable.add( () => this.initialState() ) ;
	this.babylon.containerRect.onPointerDownObservable.add( () => this.pressDown() ) ;
	this.babylon.containerRect.onPointerUpObservable.add( () => this.pressUp() ) ;
} ;



Button.prototype.initialState = function() {
	console.warn( "!!!!! ENTERING .initialState()" ) ;
	if ( this.babylon.containerRect ) {
		this.applyRectangleStyle( this.babylon.containerRect , this.containerRectStyle ) ;
	}

	/*
	if ( this.babylon.structuredTextBlock ) { this.babylon.structuredTextBlock.alpha = initialState ; }
	if ( this.babylon.boxImage ) { this.babylon.boxImage.alpha = initialState ; }
	*/
} ;



Button.prototype.hover = function() {
	console.warn( "!!!!! ENTERING .hover()" ) ;
	if ( this.babylon.containerRect ) {
		this.applyRectangleStyle( this.babylon.containerRect , this.containerRectHoverStyle ) ;
	}

	/*
	if ( this.babylon.structuredTextBlock ) { this.babylon.structuredTextBlock.alpha = hoverAlpha ; }
	if ( this.babylon.boxImage ) { this.babylon.boxImage.alpha = hoverAlpha ; }
	*/
} ;



Button.prototype.pressDown = function() {
	if ( this.babylon.containerRect ) {
		this.applyRectangleStyle( this.babylon.containerRect , this.containerRectPressedDownStyle ) ;
	}
} ;



Button.prototype.pressUp = function() {
	this.initialState() ;
	if ( this.onPress ) { this.onPress() ; }
} ;

