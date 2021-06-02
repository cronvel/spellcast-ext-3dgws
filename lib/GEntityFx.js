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



function GEntityFx( dom , gScene , data ) {
	GEntity.call( this , dom , gScene , data ) ;
}

GEntityFx.prototype = Object.create( GEntity.prototype ) ;
GEntityFx.prototype.constructor = GEntityFx ;

module.exports = GEntityFx ;



// Update the gEntity's material/texture
GEntityFx.prototype.updateMaterial = async function() {
	var material ,
		oldMaterial = this.babylon.material ,
		scene = this.gScene.babylon.scene ,
		mesh = this.babylon.mesh ;

	console.warn( "3D GEntityFx.updateMaterial()" , this.texturePackObject , this.variantObject ) ;

	this.babylon.material = material = new BABYLON.StandardMaterial( 'fxMaterial' , scene ) ;
	material.backFaceCulling = false ;
	//material.transparencyMode = BABYLON.Material.MATERIAL_ALPHATESTANDBLEND ;
	material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND ;
	material.useAlphaFromDiffuseTexture = true ;
	material.alpha = oldMaterial ? oldMaterial.alpha : this.opacity ;

	material.ambientColor = new BABYLON.Color3( 1 , 1 , 1 ) ;

	// Diffuse/Albedo
	var diffuseUrl = ( this.frameObject.maps && ( this.frameObject.maps.diffuse || this.frameObject.maps.albedo ) ) || this.frameObject.url ;

	//material.diffuseTexture = new BABYLON.Texture( this.dom.cleanUrl( diffuseUrl ) , scene ) ;
	material.diffuseTexture = this.getTexture( diffuseUrl ) ;
	material.diffuseTexture.hasAlpha = true ;
	material.diffuseTexture.wrapU = material.diffuseTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE ;

	//material.specularPower = 0 ;	// This is the sharpness of the highlight
	material.specularColor = new BABYLON.Color3( 0 , 0 , 0 ) ;

	/*
		Also:
			.ambientTexture is for ambient/occlusion
			.emissiveTexture
			.lightmapTexture
			.reflectionTexture
			.refractionTexture

	*/

	// X-flip and Y-Flip
	var xFlip = this.frameObject.xFlip ,
		yFlip = this.frameObject.yFlip ;

	this.flipTexture( material.diffuseTexture , xFlip , yFlip ) ;

	// Override this.origin, if necessary
	if ( this.frameObject.origin ) {
		let origin ;

		if ( ! xFlip && ! yFlip ) {
			origin = this.frameObject.origin ;
		}
		else {
			origin = {
				x: ( xFlip ? -this.frameObject.origin.x : this.frameObject.origin.x ) || 0 ,
				y: ( yFlip ? -this.frameObject.origin.y : this.frameObject.origin.y ) || 0 ,
				z: this.frameObject.origin.z || 0
			} ;
		}

		this.updateOrigin( origin , true ) ;
	}

	// Multiply with this.size, if necessary
	if ( this.texturePackObject.pixelDensity ) {
		this.updateSizeFromPixelDensity( material.diffuseTexture , this.texturePackObject.pixelDensity ) ;
	}
	else if ( this.frameObject.relSize ) {
		this.updateSize( this.frameObject.relSize , false , true ) ;
	}

	if ( ! mesh ) { mesh = this.updateMesh() ; }

	mesh.material = material ;

	if ( oldMaterial ) {
		oldMaterial.dispose(
			false ,	// forceDisposeEffect
			false , // forceDisposeTextures, keep texture, texture should be managed by gScene
			true	// notBoundToMesh
		) ;
	}

	this.updateMaterialNeeded = false ;
} ;



GEntityFx.prototype.updateMesh = function() {
	var mesh ,
		scene = this.gScene.babylon.scene ;

	if ( this.babylon.mesh ) { this.babylon.mesh.dispose() ; }

	this.babylon.mesh = mesh = BABYLON.Mesh.CreatePlane( 'fx' , undefined , scene ) ;	//, true ) ;

	//mesh.billboardMode = BABYLON.AbstractMesh.BILLBOARDMODE_ALL;
	//mesh.billboardMode = BABYLON.AbstractMesh.BILLBOARDMODE_X | BABYLON.AbstractMesh.BILLBOARDMODE_Y ;

	if ( this.parent ) { this.updateMeshParent() ; }
	//mesh.rotation.y = Math.PI / 2 ;

	console.warn( 'FX Mesh:' , mesh ) ;

	this.updateMeshNeeded = false ;
	return mesh ;
} ;

