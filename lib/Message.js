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
    	textBlock: null
	} ;
}

//Message.prototype = Object.create( GEntityFloatingText.prototype ) ;
//Message.prototype.constructor = Message ;

module.exports = Message ;



Message.prototype.destroy = function() {
	if ( this.babylon.textBlock ) { this.babylon.textBlock.dispose() ; }
	if ( this.babylon.rectangle ) { this.babylon.rectangle.dispose() ; }
} ;



const THEME = {} ;

THEME.default = {
	panel: {
		"background-color": "green" ,
		"border-color": "orange" ,
		"border-width": 4 ,
		"corner-radius": 20
	}
} ;



Message.prototype.create = function() {
	var ui = this.gScene.getUi() ,
		theme = this.dom.themeConfig?.message?.default ;

	var rectangle = this.babylon.rectangle = new BABYLON.GUI.Rectangle() ;
	rectangle.width = 0.2 ;
	rectangle.height = "40px" ;
	rectangle.bottom = 10 ;
	rectangle.cornerRadius = theme?.panel?.['corner-radius'] ?? THEME.default.panel['corner-radius'] ;
	rectangle.color = theme?.panel?.['border-color'] ?? THEME.default.panel['border-color'] ;
	rectangle.thickness = theme?.panel?.['border-width'] ?? THEME.default.panel['border-width'] ;
	rectangle.background = theme?.panel?.['background-color'] ?? THEME.default.panel['background-color'] ;
	ui.addControl( rectangle ) ;


	var textBlock = this.babylon.textBlock = new BABYLON.GUI.TextBlock() ;
	//textBlock.height = "50px" ;
	textBlock.color = "white" ;
	textBlock.text = extension.host.exports.toolkit.stripMarkup( this.text ) ;
	textBlock.textWrapping = true ;

	//textBlock.color = this.special.content.textColor ;
	//textBlock.alpha = this.opacity ;
	//textBlock.resizeToFit = true ;
	rectangle.addControl( textBlock ) ;
	ui.addControl( textBlock ) ;
} ;



Message.prototype.confirm = function() {
	return Promise.resolveTimeout( 2000 ) ;
} ;



Message.prototype.run = async function() {
	this.create() ;
	await this.confirm() ;
	this.destroy() ;
} ;

