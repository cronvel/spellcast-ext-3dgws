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



// Compensate for the parent scaling which enlarge and deform the floating text
GEntityFloatingText.prototype.noParentScaling = true ;



GEntityFloatingText.prototype.destroy = function() {
	if ( this.babylon.advancedTexture ) {
		this.babylon.advancedTexture.parent = null ;
		this.babylon.advancedTexture.dispose() ;
	}

	GEntity.prototype.destroy.call( this ) ;
} ;



// This GEntity has no texture
GEntityFloatingText.prototype.updateTexture = function() {} ;



// Update the gEntity's material/texture
GEntityFloatingText.prototype.updateMaterial = function() {
	var advancedTexture , textBlock , icon ,
		scene = this.gScene.babylon.scene ,
		mesh = this.babylon.mesh ;

	console.warn( "3D GEntityFloatingText.updateMaterial()" ) ;

	if ( this.babylon.advancedTexture ) {
		advancedTexture = this.babylon.advancedTexture ;
	}
	else {
		if ( ! mesh ) { mesh = this.updateMesh() ; }
		this.babylon.advancedTexture = advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh( mesh , 1024 , 64 ) ;
	}

	if ( this.babylon.textBlock ) {
		textBlock = this.babylon.textBlock ;
	}
	else {
		this.babylon.textBlock = textBlock = new BABYLON.GUI.TextBlock() ;
		// Font size should be at most 3/4 of the texture height, but with shadow, it should be even less...
		textBlock.fontSizeInPixels = 46 ;
		//textBlock.text = "test Hq Ap|█" ;
		textBlock.text = this.special.content.text ;
		textBlock.color = this.special.content.textColor ;
		textBlock.alpha = this.opacity ;
		textBlock.resizeToFit = true ;
		advancedTexture.addControl( textBlock ) ;
	}


	//mesh.material = material ;
	//mesh.material = null ;

	this.updateMaterialNeeded = false ;
} ;



// Because font does not use 100% of height all the time...
const ICON_HEIGHT_RATIO = 0.7 ;

GEntityFloatingText.prototype.updateContent = function( content ) {
	var icon ,
		advancedTexture = this.babylon.advancedTexture ,
		textBlock = this.babylon.textBlock ;

	if ( ! textBlock ) { return ; }

	if ( content.text !== undefined ) { textBlock.text = this.special.content.text = '' + content.text ; }
	if ( typeof content.textColor === 'string' ) { textBlock.color = this.special.content.textColor = content.textColor ; }
	if ( typeof content.outlineColor === 'string' ) { textBlock.outlineColor = this.special.content.outlineColor = content.outlineColor ; }
	if ( typeof content.outlineWidth === 'number' ) { textBlock.outlineWidth = this.special.content.outlineWidth = content.outlineWidth ; }
	if ( typeof content.shadowColor === 'string' ) { textBlock.shadowColor = this.special.content.shadowColor = content.shadowColor ; }
	if ( typeof content.shadowBlur === 'number' ) { textBlock.shadowBlur = this.special.content.shadowBlur = content.shadowBlur ; }

	if ( content.icon ) {
		// /!\ Use a texture instead of a direct URL? So this could be preloaded?
		if ( this.babylon.icon ) {
			icon = this.babylon.icon ;
			icon.source = this.dom.cleanUrl( content.icon ) ;
			icon.width = ICON_HEIGHT_RATIO * 0.0625 ;
			icon.height = ICON_HEIGHT_RATIO ;
		}
		else {
			this.babylon.icon = icon = new BABYLON.GUI.Image( 'icon' , this.dom.cleanUrl( content.icon ) ) ;
			icon.width = ICON_HEIGHT_RATIO * 0.0625 ;
			icon.height = ICON_HEIGHT_RATIO ;
			advancedTexture.addControl( icon ) ;
		}

		this.fixIcon() ;
	}

	//textBlock.shadowOffsetX = textBlock.shadowOffsetY = 1 ;
	//advancedTexture.background = "rgba(255,0,255,0.2)" ;
} ;



// Internal
GEntityFloatingText.prototype.fixIcon = function() {
	// The width of the TextBlock is not correctly synchronously detected,
	// we have to wait a bit for the correct width to be computed.
	if ( this.babylon.textBlock._width.isPixel ) {
		this.babylon.icon.left = -32 - this.babylon.textBlock.widthInPixels / 2 ;
	}
	else {
		setTimeout( () => this.fixIcon() , 10 ) ;
	}
} ;



// TODO?
GEntityFloatingText.prototype.updateMaterialParams = function( params , volatile = false ) {
} ;



GEntityFloatingText.prototype.updateOpacity = function( opacity , volatile = false ) {
	if ( opacity < 0 ) { opacity = 0 ; }
	else if ( opacity > 1 ) { opacity = 1 ; }

	if ( ! volatile ) { this.opacity = opacity ; }

	// It looks like changing the opacity of the whole advancedTexture does not works, so we have to change both the text and icon
	if ( this.babylon.textBlock ) { this.babylon.textBlock.alpha = opacity ; }
	if ( this.babylon.icon ) { this.babylon.icon.alpha = opacity ; }
} ;



GEntityFloatingText.prototype.updateMesh = function() {
	var mesh ,
		scene = this.gScene.babylon.scene ;

	if ( this.babylon.mesh ) { this.babylon.mesh.dispose() ; }

	this.babylon.mesh = mesh = BABYLON.PlaneBuilder.CreatePlane( 'floating-text' , { width: 80 , height: 5 } , scene ) ;
	//mesh.position.x = 0 ; mesh.position.y = 10 ; mesh.position.z = 0 ;
	mesh.billboardMode = BABYLON.AbstractMesh.BILLBOARDMODE_ALL ;

	if ( this.parent ) { this.updateMeshParent() ; }

	console.warn( 'GEntityFloatingText .updateMesh() Mesh:' , mesh ) ;

	this.updateMeshNeeded = false ;
	return mesh ;
} ;



GEntityFloatingText.prototype.updateSpecialStage2 = function( data ) {
	if ( data.special && data.special.content ) {
		this.updateContent( data.special.content ) ;
	}
} ;

