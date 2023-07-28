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



function GEntityVG( dom , gScene , data ) {
	GEntity.call( this , dom , gScene , data ) ;
	//this.babylon.billboardOrigin = new BABYLON.Vector3( 0 , 0 , 0 ) ;
}

GEntityVG.prototype = Object.create( GEntity.prototype ) ;
GEntityVG.prototype.constructor = GEntityVG ;

module.exports = GEntityVG ;



GEntityVG.prototype.forceZScalingToX = true ;



//GEntityVG.prototype.updateSpecialStage1 = function( data ) {} ;



// Update the gEntity's material/texture
GEntityVG.prototype.updateMaterial = async function() {
	var material ,
		oldMaterial = this.babylon.material ,
		scene = this.gScene.babylon.scene ,
		mesh = this.babylon.mesh ;

	console.warn( "3D GEntityVG.updateMaterial()" , this.texturePackObject , this.variantObject ) ;

	this.babylon.material = material = new BABYLON.StandardMaterial( 'vgMaterial' , scene ) ;
	//material.backFaceCulling = true ;

	material.ambientColor = new BABYLON.Color3( 1 , 1 , 1 ) ;

	// Diffuse/Albedo
	material.diffuseTexture = new BABYLON.DynamicTexture( 'vgDynamicTexture' , { width: 512 , height: 512 } , scene ) ;
	material.diffuseTexture.hasAlpha = true ;
	material.diffuseTexture.wrapU = material.diffuseTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE ;
	let ctx = material.diffuseTexture.getContext() ;
	ctx.beginPath();
	ctx.moveTo(75*2, 25*2);
	ctx.quadraticCurveTo(25*2, 25*2, 25*2, 62.5*2);
	ctx.quadraticCurveTo(25*2, 100*2, 50*2, 100*2);
	ctx.quadraticCurveTo(50*2, 120*2, 30*2, 125*2);
	ctx.quadraticCurveTo(60*2, 120*2, 65*2, 100*2);
	ctx.quadraticCurveTo(125*2, 100*2, 125*2, 62.5*2);
	ctx.quadraticCurveTo(125*2, 25*2, 75*2, 25*2);
	ctx.fillStyle = "white";
	ctx.fill();
    material.diffuseTexture.update();

	/*
	// Multiply with this.size, if necessary
	if ( this.texturePackObject.pixelDensity ) {
		this.updateSizeFromPixelDensity( material.diffuseTexture , this.texturePackObject.pixelDensity ) ;
	}
	else if ( this.frameObject.relSize ) {
		this.updateSize( this.frameObject.relSize , false , true ) ;
	}
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



GEntityVG.prototype.updateMesh = function() {
	var mesh ,
		scene = this.gScene.babylon.scene ;

	if ( this.babylon.mesh ) { this.babylon.mesh.dispose() ; }

	this.babylon.mesh = mesh = BABYLON.Mesh.CreatePlane( 'vg' , undefined , scene ) ;	//, true ) ;

	if ( this.parent ) { this.updateMeshParent() ; }

	console.warn( 'VG Mesh:' , mesh ) ;

	this.updateMeshNeeded = false ;
	return mesh ;
} ;

