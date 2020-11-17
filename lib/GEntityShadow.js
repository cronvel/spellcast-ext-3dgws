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
const GEntity = require( './GEntity.js' ) ;
const GTransition = require( './GTransition.js' ) ;

const vectorUtils = require( './vectorUtils.js' ) ;

const Promise = require( 'seventh' ) ;



function GEntityShadow( dom , gScene , data ) {
	GEntity.call( this , dom , gScene , data ) ;

	this.autoFacing = this.autoFacing.bind( this ) ;

	//this.babylon.billboardOrigin = new Babylon.Vector3( 0 , 0 , 0 ) ;
}

GEntityShadow.prototype = Object.create( GEntity.prototype ) ;
GEntityShadow.prototype.constructor = GEntityShadow ;

module.exports = GEntityShadow ;



// Update the gEntity's material/texture
GEntityShadow.prototype.updateMaterial = function() {
	var material ,
		oldMaterial = this.babylon.material ,
		scene = this.gScene.babylon.scene ,
		mesh = this.babylon.mesh ;

	console.warn( "3D GEntityShadow.updateMaterial()" , this.texturePackObject , this.variantObject ) ;

	var frame = this.variantObject.frames[ 0 ] ;
	this.babylon.material = material = new Babylon.StandardMaterial( 'spriteMaterial' , scene ) ;
	material.backFaceCulling = true ;

	material.ambientColor = new Babylon.Color3( 1 , 1 , 1 ) ;

	// Diffuse/Albedo
	var diffuseUrl = ( frame.maps && ( frame.maps.diffuse || frame.maps.albedo ) ) || frame.url
	material.diffuseTexture = new Babylon.Texture( this.dom.cleanUrl( diffuseUrl ) , scene ) ;
	material.diffuseTexture.hasAlpha = true ;
	material.diffuseTexture.wrapU = material.diffuseTexture.wrapV = Babylon.Texture.CLAMP_ADDRESSMODE ;

	// Normal/Bump
	var bumpUrl = frame.maps && ( frame.maps.normal || frame.maps.bump ) ;
	if ( bumpUrl ) {
		material.bumpTexture = new Babylon.Texture( this.dom.cleanUrl( bumpUrl ) , scene ) ;
		material.bumpTexture.wrapU = material.bumpTexture.wrapV = Babylon.Texture.CLAMP_ADDRESSMODE ;
		
		// BabylonJS use DirectX normalmap, but most software export OpenGL normalmap
		material.invertNormalMapX = true ;
		material.invertNormalMapY = true ;
	}
	
	// Specular
	var specularUrl = frame.maps && frame.maps.specular ;
	if ( specularUrl ) {
		material.specularTexture = new Babylon.Texture( this.dom.cleanUrl( specularUrl ) , scene ) ;
		material.specularTexture.wrapU = material.specularTexture.wrapV = Babylon.Texture.CLAMP_ADDRESSMODE ;
		//material.specularPower = 1 ;
		material.useGlossinessFromSpecularMapAlpha = true ;
	}
	else {
		//material.specularPower = 0 ;	// This is the sharpness of the highlight
		material.specularColor = new Babylon.Color3( 0 , 0 , 0 ) ;
	}

	/*
		Also:
			.ambientTexture is for ambient/occlusion
			.emissiveTexture
			.lightmapTexture
			.reflectionTexture
			.refractionTexture
			
	*/

	// /!\ TEMP! Easier to debug!
	material.backFaceCulling = false ;

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



GEntityShadow.prototype.updateMesh = function() {
	var mesh ,
		scene = this.gScene.babylon.scene ;

	if ( this.babylon.mesh ) { this.babylon.mesh.dispose() ; }

	this.babylon.mesh = mesh = Babylon.Mesh.CreatePlane( 'shadow' , undefined , scene ) ;	//, true ) ;

	mesh.scaling.x = this.size.x ;
	mesh.scaling.y = this.size.y ;

	console.warn( 'Mesh:' , mesh ) ;

	this.updateMeshNeeded = false ;
	return mesh ;
} ;

