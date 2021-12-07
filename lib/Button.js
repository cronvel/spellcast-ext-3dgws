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

const extension = require( './browser-extension.js' ) ;

const deepExtend = require( 'tree-kit/lib/extend.js' ).bind( null , { deep: true } ) ;
const Promise = require( 'seventh' ) ;



function Button( dom , gScene , text , options = {} ) {
	TextBox.call( this , dom , gScene , text , options ) ;

	this.hoverWidth = this.pressedDownWidth = null ;
	this.hoverHeight = this.pressedDownHeight = null ;

	this.rectangleHoverStyle = {} ;
	this.rectanglePressedDownStyle = {} ;

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
			backgroundColor: "green" ,
			borderColor: "orange" ,
			borderWidth: 4 ,
			cornerRadius: 20 ,
			padding: {
				left: "10px" ,
				top: "10px" ,
				right: "10px" ,
				bottom: "10px"
			} ,
			hover: {
				//size: 0.95 ,
				backgroundColor: "green" ,
				borderColor: "red" ,
				borderWidth: 4
			} ,
			pressedDown: {
				size: 0.9 ,
				backgroundColor: "#66aa66" ,
				borderColor: "red" ,
				borderWidth: 4
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
	
	if ( defaultTheme?.panel?.hover ) { deepExtend( this.rectangleHoverStyle , defaultTheme.panel.hover ) ; }
	if ( theme?.panel?.hover ) { deepExtend( this.rectangleHoverStyle , theme.panel.hover ) ; }

	if ( defaultTheme?.panel?.pressedDown ) { deepExtend( this.rectanglePressedDownStyle , defaultTheme.panel.pressedDown ) ; }
	if ( theme?.panel?.pressedDown ) { deepExtend( this.rectanglePressedDownStyle , theme.panel.pressedDown ) ; }

	if ( this.rectangleHoverStyle.size ) {
		this.hoverWidth = this.width * this.rectangleHoverStyle.size ;
		this.hoverHeight = this.height * this.rectangleHoverStyle.size ;
	}
	
	if ( this.rectanglePressedDownStyle.size ) {
		this.pressedDownWidth = this.width * this.rectanglePressedDownStyle.size ;
		this.pressedDownHeight = this.height * this.rectanglePressedDownStyle.size ;
	}

	this.babylon.mainControl.hoverCursor = 'pointer' ;

	this.babylon.mainControl.onPointerEnterObservable.add( () => this.hover() ) ;
	this.babylon.mainControl.onPointerOutObservable.add( () => this.initialState() ) ;
	this.babylon.mainControl.onPointerDownObservable.add( () => this.pressDown() ) ;
	this.babylon.mainControl.onPointerUpObservable.add( () => this.pressUp() ) ;
} ;



const initialState = 1 ;

Button.prototype.initialState = function() {
	console.warn( "!!!!! ENTERING .initialState()" ) ;
	if ( this.hoverWidth || this.pressedDownWidth ) {
		this.babylon.mainControl.width = this.width ;
		this.babylon.mainControl.height = this.height ;
	}
	
	if ( this.babylon.rectangle ) {
		this.babylon.rectangle.alpha = initialState ;
		this.applyRectangleStyle( this.babylon.rectangle , this.rectangleStyle ) ;
	}

	if ( this.babylon.structuredTextBlock ) { this.babylon.structuredTextBlock.alpha = initialState ; }
	if ( this.babylon.boxImage ) { this.babylon.boxImage.alpha = initialState ; }
} ;



const hoverAlpha = 0.5 ;

Button.prototype.hover = function() {
	console.warn( "!!!!! ENTERING .hover()" ) ;
	if ( this.hoverWidth ) {
		this.babylon.mainControl.width = this.hoverWidth ;
		this.babylon.mainControl.height = this.hoverHeight ;
		console.warn( "+++ set size to" , this.hoverWidth , this.hoverHeight ) ;
	}

	if ( this.babylon.rectangle ) {
		this.babylon.rectangle.alpha = hoverAlpha ;
		this.applyRectangleStyle( this.babylon.rectangle , this.rectangleHoverStyle ) ;
	}

	if ( this.babylon.structuredTextBlock ) { this.babylon.structuredTextBlock.alpha = hoverAlpha ; }
	if ( this.babylon.boxImage ) { this.babylon.boxImage.alpha = hoverAlpha ; }
} ;



Button.prototype.pressDown = function() {
	if ( this.pressedDownWidth ) {
		this.babylon.mainControl.width = this.pressedDownWidth ;
		this.babylon.mainControl.height = this.pressedDownHeight ;
	}

	if ( this.babylon.rectangle ) {
		this.applyRectangleStyle( this.babylon.rectangle , this.rectanglePressedDownStyle ) ;
	}
} ;



Button.prototype.pressUp = function() {
	this.initialState() ;
	if ( this.onPress ) { this.onPress() ; }
} ;

