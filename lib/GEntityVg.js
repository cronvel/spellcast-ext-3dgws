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



function GEntityVg( dom , gScene , data ) {
	GEntity.call( this , dom , gScene , data ) ;
	//this.babylon.billboardOrigin = new BABYLON.Vector3( 0 , 0 , 0 ) ;
}

GEntityVg.prototype = Object.create( GEntity.prototype ) ;
GEntityVg.prototype.constructor = GEntityVg ;

module.exports = GEntityVg ;



GEntityVg.prototype.useVg = true ;
//GEntityVg.prototype.noLocalLighting = true ;
GEntityVg.prototype.forceZScalingToX = true ;



// Update the gEntity's material/texture
GEntityVg.prototype.updateMaterial = async function() {
	var material ,
		vgObject = this.special.vgObject ,
		oldMaterial = this.babylon.material ,
		scene = this.gScene.babylon.scene ,
		mesh = this.babylon.mesh ;

	if ( ! vgObject ) {
		console.error( "No VG object!" ) ;
		return ;
	}

	console.warn( "3D GEntityVg.updateMaterial()" , this.texturePackObject , this.variantObject ) ;

	this.babylon.material = material = new BABYLON.StandardMaterial( 'vgMaterial' , scene ) ;
	//material.backFaceCulling = true ;

	material.ambientColor = new BABYLON.Color3( 1 , 1 , 1 ) ;

	// Diffuse/Albedo
	var vgSize = { width: vgObject.viewBox.width , height: vgObject.viewBox.height } ;
	material.diffuseTexture = new BABYLON.DynamicTexture( 'vgDynamicTexture' , vgSize , scene ) ;
	material.diffuseTexture.hasAlpha = true ;
	material.diffuseTexture.wrapU = material.diffuseTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE ;

	// Now render the Vector Graphics
	var ctx = material.diffuseTexture.getContext() ;
	await vgObject.renderCanvas( ctx ) ;
    material.diffuseTexture.update() ;

	// Multiply with this.size, if necessary
	if ( this.special.vgPixelDensity ) {
		this.updateSizeFromPixelDensity( material.diffuseTexture , this.special.vgPixelDensity ) ;
	}

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



GEntityVg.prototype.updateMesh = function() {
	var mesh ,
		scene = this.gScene.babylon.scene ;

	if ( this.babylon.mesh ) { this.babylon.mesh.dispose() ; }

	this.babylon.mesh = mesh = BABYLON.Mesh.CreatePlane( 'vg' , undefined , scene ) ;	//, true ) ;

	if ( this.parent ) { this.updateMeshParent() ; }

	console.warn( 'Vg Mesh:' , mesh ) ;

	this.updateMeshNeeded = false ;
	return mesh ;
} ;

