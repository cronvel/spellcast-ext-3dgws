/*
	Spellcast's Web Client Extension

	Copyright (c) 2014 - 2020 Cédric Ronvel

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



const Babylon = require( 'babylonjs' ) ;
Babylon.GUI = require( './babylon.gui.min.js' ) ;
const GEntity = require( './GEntity.js' ) ;
const GTransition = require( './GTransition.js' ) ;

const vectorUtils = require( './vectorUtils.js' ) ;

const Promise = require( 'seventh' ) ;



function GEntityFloatingText( dom , gScene , data ) {
	GEntity.call( this , dom , gScene , data ) ;

	this.special.content = {
		text: '' ,
		textColor: 'white'
	} ;
}

GEntityFloatingText.prototype = Object.create( GEntity.prototype ) ;
GEntityFloatingText.prototype.constructor = GEntityFloatingText ;

module.exports = GEntityFloatingText ;



// This GEntity has no texture
GEntityFloatingText.prototype.updateTexture = function() {} ;



// Update the gEntity's material/texture
GEntityFloatingText.prototype.updateMaterial = function() {
	var advancedTexture , textBlock ,
		scene = this.gScene.babylon.scene ,
		mesh = this.babylon.mesh ;

	console.warn( "3D GEntityFloatingText.updateMaterial()" ) ;

	if ( this.babylon.advancedTexture ) {
		advancedTexture = this.babylon.advancedTexture ;
	}
	else {
		if ( ! mesh ) { mesh = this.updateMesh() ; }
		this.babylon.advancedTexture = advancedTexture = Babylon.GUI.AdvancedDynamicTexture.CreateForMesh( mesh , 1024 , 64 ) ;
	}

	if ( this.babylon.textBlock ) {
		textBlock = this.babylon.textBlock ;
	}
	else {
		this.babylon.textBlock = textBlock = new Babylon.GUI.TextBlock() ;
		// Font size should be at most 3/4 of the texture height, but with shadow, it should be even less...
		textBlock.fontSizeInPixels = 46 ;
		//textBlock.text = "coucou Ap|█" ;
		textBlock.text = this.special.content.text ;
		textBlock.color = this.special.content.textColor ;
		advancedTexture.addControl( textBlock ) ;
	}

	//mesh.material = material ;
	//mesh.material = null ;

	this.updateMaterialNeeded = false ;
} ;



GEntityFloatingText.prototype.updateMesh = function() {
	var mesh ,
		scene = this.gScene.babylon.scene ;

	if ( this.babylon.mesh ) { this.babylon.mesh.dispose() ; }

	this.babylon.mesh = mesh = Babylon.PlaneBuilder.CreatePlane( 'floating-text' , { width: 80 , height: 5 } , scene ) ;
	//mesh.position.x = 0 ; mesh.position.y = 10 ; mesh.position.z = 0 ;
	mesh.billboardMode = Babylon.AbstractMesh.BILLBOARDMODE_ALL;

	//mesh.scaling.x = this.size.x ;
	//mesh.scaling.y = this.size.y ;

	console.warn( 'GEntityFloatingText .updateMesh() Mesh:' , mesh ) ;

	this.updateMeshNeeded = false ;
	return mesh ;
} ;



GEntityFloatingText.prototype.updateSpecialStage2 = function( data ) {
	if ( data.special && data.special.content ) {
		this.updateContent( data.special.content ) ;
	}
} ;



GEntityFloatingText.prototype.updateContent = function( content ) {
	var textBlock = this.babylon.textBlock ;

	if ( ! textBlock ) { return ; }

	if ( content.text !== undefined ) { textBlock.text = this.special.content.text = '' + content.text ; }
	if ( typeof content.textColor === 'string' ) { textBlock.color = this.special.content.textColor = content.textColor ; }
	if ( typeof content.shadowColor === 'string' ) { textBlock.shadowColor = this.special.content.shadowColor = content.shadowColor ; }
	if ( typeof content.shadowBlur === 'number' ) { textBlock.shadowBlur = this.special.content.shadowBlur = content.shadowBlur ; }

	//textBlock.shadowOffsetX = textBlock.shadowOffsetY = 1 ;
	//advancedTexture.background = "rgba(255,0,255,0.2)" ;
} ;

