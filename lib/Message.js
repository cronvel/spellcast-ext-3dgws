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



//const Promise = require( 'seventh' ) ;



function Message( dom , gScene , data ) {
	this.gScene = gScene ;
    this.dom = dom ;    // Dom instance, immutable

    this.babylon = {
		material: null ,
		mesh: null ,
		texture: null , // Only relevant for material-less entity, like particle system
	} ;
}

//Message.prototype = Object.create( GEntityFloatingText.prototype ) ;
//Message.prototype.constructor = Message ;

module.exports = Message ;



Message.prototype.destroy = function() {
	//if ( this.babylon.textBlock ) { this.babylon.textBlock.dispose() ; }
	//if ( this.babylon.icon ) { this.babylon.icon.dispose() ; }
} ;



// https://forum.babylonjs.com/t/different-text-styles-colour-bold-within-one-textblock/6015
Message.prototype.createText = function( text ) {
	var ui ;

	if ( this.gScene.babylon.ui ) {
		ui = this.gScene.babylon.ui ;
	}
	else {
		this.gScene.babylon.ui = ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI( 'ui' ) ;
	}

	var textBlock = new BABYLON.GUI.TextBlock() ;
	//textBlock.height = "50px" ;
	textBlock.color = "white" ;
	
	textBlock.text = text ;
	textBlock.textWrapping = true ;
	
	//textBlock.color = this.special.content.textColor ;
	//textBlock.alpha = this.opacity ;
	//textBlock.resizeToFit = true ;
	ui.addControl( textBlock ) ;
} ;

