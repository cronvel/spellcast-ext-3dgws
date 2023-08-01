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



function GEntityCard( dom , gScene , data ) {
	GEntity.call( this , dom , gScene , data ) ;
	//this.babylon.billboardOrigin = new BABYLON.Vector3( 0 , 0 , 0 ) ;
}

GEntityCard.prototype = Object.create( GEntity.prototype ) ;
GEntityCard.prototype.constructor = GEntityCard ;

module.exports = GEntityCard ;



GEntityCard.prototype.useVg = true ;
//GEntityCard.prototype.noLocalLighting = true ;
GEntityCard.prototype.forceZScalingToX = true ;



// Update the gEntity's material/texture
GEntityCard.prototype.updateMaterial = async function() {
	var material , frontMaterial , backMaterial ,
		vgObject = this.special.vgObject ,
		backVgObject = this.special.backVgObject ,
		oldMaterial = this.babylon.material ,
		scene = this.gScene.babylon.scene ,
		mesh = this.babylon.mesh ;

	if ( ! vgObject || ! backVgObject ) {
		console.error( "No VG object or back VG object" , vgObject , backVgObject ) ;
		return ;
	}

	console.warn( "3D GEntityCard.updateMaterial()" ) ;


	// Front material
	
	frontMaterial = new BABYLON.StandardMaterial( 'cardMaterial' , scene ) ;
	frontMaterial.backFaceCulling = true ;
	frontMaterial.ambientColor = new BABYLON.Color3( 1 , 1 , 1 ) ;

	// Diffuse/Albedo
	var vgSize = { width: vgObject.viewBox.width , height: vgObject.viewBox.height } ;
	frontMaterial.diffuseTexture = new BABYLON.DynamicTexture( 'cardDynamicTexture' , vgSize , scene ) ;
	frontMaterial.diffuseTexture.hasAlpha = true ;
	frontMaterial.diffuseTexture.wrapU = frontMaterial.diffuseTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE ;

	// Now render the Vector Graphics
	var ctx = frontMaterial.diffuseTexture.getContext() ;
	await vgObject.renderCanvas( ctx ) ;
    frontMaterial.diffuseTexture.update() ;


    // Back material

	backMaterial = new BABYLON.StandardMaterial( 'cardBackMaterial' , scene ) ;
	backMaterial.backFaceCulling = true ;
	backMaterial.ambientColor = new BABYLON.Color3( 1 , 1 , 1 ) ;

	// Diffuse/Albedo
	var backVgSize = { width: backVgObject.viewBox.width , height: backVgObject.viewBox.height } ;
	backMaterial.diffuseTexture = new BABYLON.DynamicTexture( 'cardBackDynamicTexture' , backVgSize , scene ) ;
	backMaterial.diffuseTexture.hasAlpha = true ;
	backMaterial.diffuseTexture.wrapU = backMaterial.diffuseTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE ;

	// Now render the Vector Graphics
	var ctx = backMaterial.diffuseTexture.getContext() ;
	await backVgObject.renderCanvas( ctx ) ;
    backMaterial.diffuseTexture.update() ;


    // Now create the sub-material

	this.babylon.material = material = new BABYLON.MultiMaterial( 'multi' , scene ) ;
	material.subMaterials.push( frontMaterial ) ;
	material.subMaterials.push( backMaterial ) ;


	// Multiply with this.size, if necessary
	if ( this.special.vgPixelDensity ) {
		this.updateSizeFromPixelDensity( frontMaterial.diffuseTexture , this.special.vgPixelDensity ) ;
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



var FRONT_FAKE_MATERIAL , BACK_FAKE_MATERIAL ;

GEntityCard.prototype.updateMesh = function() {
	var mesh , frontMesh , backMesh ,
		scene = this.gScene.babylon.scene ;

	if ( this.babylon.mesh ) { this.babylon.mesh.dispose() ; }

	// We are about to create a merged mesh with multi-materials

	frontMesh = BABYLON.Mesh.CreatePlane( 'card' , undefined , scene ) ;
	backMesh = BABYLON.Mesh.CreatePlane( 'card-back' , undefined , scene , undefined , BABYLON.Mesh.BACKSIDE ) ;

	// For some reason, both mesh MUST have their own materials BEFORE merging them, if not they will share the first subMaterial later
	if ( ! FRONT_FAKE_MATERIAL ) {
		FRONT_FAKE_MATERIAL = new BABYLON.StandardMaterial( 'card-front-fake-material' ) ;
		BACK_FAKE_MATERIAL = new BABYLON.StandardMaterial( 'card-back-fake-material' ) ;
	}

	frontMesh.material = FRONT_FAKE_MATERIAL ;
	backMesh.material = BACK_FAKE_MATERIAL ;

	this.babylon.mesh = mesh = BABYLON.Mesh.MergeMeshes( [ frontMesh , backMesh ] , true , undefined , undefined , undefined , true ) ;

	if ( this.parent ) { this.updateMeshParent() ; }

	console.warn( 'Card Mesh:' , mesh ) ;

	this.updateMeshNeeded = false ;
	return mesh ;
} ;

