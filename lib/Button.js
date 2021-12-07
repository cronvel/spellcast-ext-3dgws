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
const Promise = require( 'seventh' ) ;



function Button( dom , gScene , text , options = {} ) {
	TextBox.call( this , dom , gScene , text , options ) ;
	
	// The hook to be called when the Button is pressed
	this.onPress = null ;
}

Button.prototype = Object.create( TextBox.prototype ) ;
Button.prototype.constructor = Button ;

module.exports = Button ;



Button.prototype.run = function(  ) {
	this.createGUI() ;
	this.onPress = onPress ;
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



Button.prototype.createGUI = function( theme = this.dom.themeConfig?.button?.default , defaultTheme = THEME.default ) {
	TextBox.prototype.createGUI.call( this , theme , defaultTheme ) ;
	
	this.babylon.mainControl.onPointerClickObservable.add( () => {
		this.press() ;
	} ) ;
} ;



Button.prototype.press = async function() {
	if ( this.onPress ) {
		await this.onPress() ;
	}
} ;

