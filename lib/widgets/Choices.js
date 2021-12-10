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



const Button = require( './Button.js' ) ;

const extension = require( '../browser-extension.js' ) ;

const deepExtend = require( 'tree-kit/lib/extend.js' ).bind( null , { deep: true } ) ;
const Promise = require( 'seventh' ) ;



function Choices( dom , gScene , choices , undecidedNames , onSelect , options = {} , parent = null ) {
	this.dom = dom ;    // Dom instance, immutable
	this.gScene = gScene ;
	this.parent = parent ?? this.gScene ;

	this.choices = choices ;
	this.undecidedNames = undecidedNames ;
	this.onSelect = onSelect ;

	//this.type = options.type ;
	//this.wait = options.wait || 0 ;

	this.buttons = this.choices.map( choice => new Button( this.dom , this.gScene , choice.label , {} , this ) ) ;

	this.guiCreates = false ;

	this.babylon = {
		containerStack: null
	} ;
}

module.exports = Choices ;



Choices.prototype.destroy = function() {
	this.buttons.forEach( button => button.destroy() ) ;
} ;



Choices.prototype.getUi = function() { return this.babylon.containerStack ; } ;



Choices.prototype.run = async function() {
	if ( ! this.guiCreated ) { this.createGUI() ; }

	var promise = new Promise() ;

	var choose = index => {
		console.warn( "Choice index:" , index ) ;
	} ;

	this.buttons.forEach( ( button , index ) => {
		button.run( () => choose( index ) ) ;
	} ) ;

	await promise ;

	this.destroy() ;
} ;



const THEME = Choices.THEME = deepExtend( {} , Button.THEME , {
	default: {
		panel: {
			width: 0.2 ,
			height: 0.1
		} ,
		text: {
			color: "black" ,
			fontSize: "22px" ,
			outlineWidth: 2 ,
			outlineColor: "white"
		}
	}
} ) ;



Choices.prototype.createGUI = function( theme = this.dom.themeConfig?.choices?.default , defaultTheme = THEME.default ) {
	if ( this.guiCreated ) { return ; }

	var stack = this.babylon.containerStack = new BABYLON.GUI.StackPanel() ;
	stack.isVertical = true ;
	this.childrenWidthInPixelsRequired = false ;
	this.childrenHeightInPixelsRequired = true ;
	this.childrenMaxHeight = this.parent.getUi().getSize().height ;

	this.parent.getUi().addControl( stack ) ;

	this.buttons.forEach( button => {
		button.createGUI( theme , defaultTheme ) ;
	} ) ;

	this.guiCreated = true ;
} ;

