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



function GEntitySprite( dom , gScene , data ) {
	GEntity.call( this , dom , gScene , data ) ;

	this.autoFacing = this.autoFacing.bind( this ) ;
	//this.babylon.billboardOrigin = new BABYLON.Vector3( 0 , 0 , 0 ) ;
}

GEntitySprite.prototype = Object.create( GEntity.prototype ) ;
GEntitySprite.prototype.constructor = GEntitySprite ;

module.exports = GEntitySprite ;



GEntitySprite.prototype.forceZScalingToX = true ;



GEntitySprite.prototype.updateSpecialStage1 = function( data ) {
	GEntity.prototype.updateSpecialStage1.call( this , data ) ;

	if (
		data.special.spriteAutoFacing !== undefined
		&& ( data.special.spriteAutoFacing === false || vectorUtils.radToSector[ data.special.spriteAutoFacing ] )
		&& data.special.spriteAutoFacing !== this.special.spriteAutoFacing
	) {
		this.special.spriteAutoFacing = data.special.spriteAutoFacing ;

		//console.warn( "@@@@@@@@@@ data.special.spriteAutoFacing" , this.special.spriteAutoFacing ) ;
		if ( this.special.spriteAutoFacing ) {
			this.gScene.on( 'render' , this.autoFacing ) ;
		}
		else {
			this.gScene.off( 'render' , this.autoFacing ) ;
		}
	}
} ;



GEntitySprite.prototype.updateFacing = function( facing ) {
	this.facing = facing ;
	if ( this.special.spriteAutoFacing ) { this.autoFacing() ; }
} ;



// Update the gEntity's material/texture
GEntitySprite.prototype.updateMaterial = async function() {
	var material ,
		oldMaterial = this.babylon.material ,
		scene = this.gScene.babylon.scene ,
		mesh = this.babylon.mesh ;

	console.warn( "3D GEntitySprite.updateMaterial()" , this.texturePackObject , this.variantObject ) ;

	this.babylon.material = material = new BABYLON.StandardMaterial( 'spriteMaterial' , scene ) ;
	material.backFaceCulling = true ;

	material.ambientColor = new BABYLON.Color3( 1 , 1 , 1 ) ;

	// Diffuse/Albedo
	var diffuseUrl = ( this.frameObject.maps && ( this.frameObject.maps.diffuse || this.frameObject.maps.albedo ) ) || this.frameObject.url ;

	//material.diffuseTexture = new BABYLON.Texture( this.dom.cleanUrl( diffuseUrl ) , scene ) ;
	material.diffuseTexture = this.getTexture( diffuseUrl ) ;
	material.diffuseTexture.hasAlpha = true ;
	material.diffuseTexture.wrapU = material.diffuseTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE ;

	// Normal/Bump
	var bumpUrl = this.frameObject.maps && ( this.frameObject.maps.normal || this.frameObject.maps.bump ) ;
	if ( bumpUrl ) {
		//material.bumpTexture = new BABYLON.Texture( this.dom.cleanUrl( bumpUrl ) , scene ) ;
		material.bumpTexture = this.getTexture( bumpUrl ) ;
		material.bumpTexture.wrapU = material.bumpTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE ;

		// BABYLONJS use DirectX normalmap, but most software export OpenGL normalmap
		material.invertNormalMapX = true ;
		material.invertNormalMapY = true ;
	}

	// Specular
	var specularUrl = this.frameObject.maps && this.frameObject.maps.specular ;
	if ( specularUrl ) {
		//material.specularTexture = new BABYLON.Texture( this.dom.cleanUrl( specularUrl ) , scene ) ;
		material.specularTexture = this.getTexture( specularUrl ) ;
		material.specularTexture.wrapU = material.specularTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE ;
		//material.specularPower = 1 ;
		material.useGlossinessFromSpecularMapAlpha = true ;
	}
	else {
		//material.specularPower = 0 ;	// This is the sharpness of the highlight
		material.specularColor = new BABYLON.Color3( 0 , 0 , 0 ) ;
	}

	/*
		Also:
			.ambientTexture is for ambient/occlusion
			.emissiveTexture
			.lightmapTexture
			.reflectionTexture
			.refractionTexture

	*/

	// X-flip and Y-Flip
	var xFlip = ! this.frameObject.xFlip !== ! this.clientMods.xFlip ,
		yFlip = this.frameObject.yFlip ;	// this.clientMods.yFlip does not exist (xFlip is for autofacing, which only change azimuth)

	this.flipTexture( material.diffuseTexture , xFlip , yFlip ) ;
	if ( material.bumpTexture ) { this.flipTexture( material.bumpTexture , xFlip , yFlip ) ; }
	if ( material.specularTexture ) { this.flipTexture( material.specularTexture , xFlip , yFlip ) ; }

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



GEntitySprite.prototype.updateMesh = function() {
	var mesh ,
		scene = this.gScene.babylon.scene ;

	if ( this.babylon.mesh ) { this.babylon.mesh.dispose() ; }

	this.babylon.mesh = mesh = BABYLON.Mesh.CreatePlane( 'sprite' , undefined , scene ) ;	//, true ) ;

	// Force billboard mode
	//mesh.billboardMode = BABYLON.AbstractMesh.BILLBOARDMODE_ALL;
	mesh.billboardMode = BABYLON.AbstractMesh.BILLBOARDMODE_X | BABYLON.AbstractMesh.BILLBOARDMODE_Y ;

	if ( this.parent ) { this.updateMeshParent() ; }

	console.warn( 'Sprite Mesh:' , mesh ) ;

	this.updateMeshNeeded = false ;
	return mesh ;
} ;



// Disable billboard changes ATM, it is forced to X|Y
GEntitySprite.prototype.updateBillboard = function() {} ;



GEntitySprite.prototype.autoFacing = function( changes = null ) {
	if ( changes ) {
		if ( ! changes.camera && ! this.parametric ) { return ; }
	}

	// IMPORTANT: use actual babylon.mesh's position, not gEntity's position
	// This is because parametric animation only exists in babylon.mesh,
	// while gEntity continue tracking the server-side position.
	var offset ,
		mesh = this.babylon.mesh ,
		position = mesh.position ,
		cameraPosition = this.gScene.globalCamera.babylon.camera.position ,
		angle = vectorUtils.facingAngleRad( cameraPosition , position , this.facing ) ,
		sector = vectorUtils.radToSector[ this.special.spriteAutoFacing ]( angle ) ;

	//*
	if ( this.frameObject.zOffset !== null ) {
		offset = cameraPosition.subtract( position ) ;
		offset.y = 0 ;
		// mesh.scaling.y would give better results but would also cause redraw bug: change of frame would change zOffset,
		// that in turn could change frame due to autoFacing, and cause a bad looking loop
		offset.normalize().scaleInPlace( this.frameObject.zOffset * this.size.y ) ;
		//console.warn( "offset:" , offset.x , offset.y , offset.z ) ;
		this.updatePosition( { position: offset } , false , true ) ;
	}
	//*/

	if ( this.clientMods.variant !== sector ) {
		this.clientMods.variant = sector ;
		this.clientMods.xFlipVariant = vectorUtils.xFlipSector[ sector ] ;
		this.refreshMaterial() ;
	}
} ;

