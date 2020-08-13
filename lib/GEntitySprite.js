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

const Promise = require( 'seventh' ) ;



function GEntitySprite( dom , gScene , data ) {
	GEntity.call( this , dom , gScene , data ) ;

	//this.babylon.billboardOrigin = new Babylon.Vector3( 0 , 0 , 0 ) ;
}

GEntitySprite.prototype = Object.create( GEntity.prototype ) ;
GEntitySprite.prototype.constructor = GEntitySprite ;

module.exports = GEntitySprite ;



// Update the gEntity's texture
GEntitySprite.prototype.updateTexture_ = function( texturePack , variant ) {
	var material , texture ,
		oldMaterial = this.babylon.material ,
		scene = this.gScene.babylon.scene ,
		mesh = this.babylon.mesh ;

	console.warn( "3D GEntitySprite.updateTexture_()" , texturePack , variant ) ;

	var url = variant.frames[ 0 ].url ;
	this.babylon.material = material = new Babylon.StandardMaterial( 'spriteMaterial' , scene ) ;
	material.backFaceCulling = true ;

	material.ambientColor = new Babylon.Color3( 1 , 1 , 1 ) ;
	material.diffuseTexture = texture = new Babylon.Texture( this.dom.cleanUrl( url ) , scene ) ;
	texture.hasAlpha = true ;
	texture.wrapU = texture.wrapV = Babylon.Texture.CLAMP_ADDRESSMODE ;

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
} ;



// Size, positioning and rotation
GEntitySprite.prototype.updateMesh = function() {
	var mesh ,
		scene = this.gScene.babylon.scene ;

	if ( this.babylon.mesh ) { this.babylon.mesh.dispose() ; }

	this.babylon.mesh = mesh = Babylon.Mesh.CreatePlane( 'sprite' , undefined , scene ) ;	//, true ) ;

	//mesh.billboardMode = Babylon.AbstractMesh.BILLBOARDMODE_ALL;
	mesh.billboardMode = Babylon.AbstractMesh.BILLBOARDMODE_X | Babylon.AbstractMesh.BILLBOARDMODE_Y ;

	mesh.scaling.x = this.size.x ;
	mesh.scaling.y = this.size.y ;

	// Billboard mode is not sensible to pivot (as of v4.2.0-alpha31), this is a workaround for that, see:
	// https://forum.babylonjs.com/t/sprite-planting-i-e-sprite-origin-at-the-bottom/13337/8
	// Alternative is to mesh.bakeTransformIntoVertices(), done by this.updateOrigin()
	// Otherwise if/when 'usePivotForBillboardMode' option is accepted, use simply mesh.setPivot*()
	/*
	//this.babylon.billboardOrigin.y = -0.5 ;
	mesh.onAfterWorldMatrixUpdateObservable.add( () => {
		var pivot = this.babylon.billboardOrigin ,
			matrix = Babylon.TmpVectors.Matrix[ 0 ] ,
			worldMatrix = mesh.getWorldMatrix() ;

		// Apply pivot point
		matrix.setRowFromFloats( 0 , 1 , 0 , 0 , 0 ) ;
		matrix.setRowFromFloats( 1 , 0 , 1 , 0 , 0 ) ;
		matrix.setRowFromFloats( 2 , 0 , 0 , 1 , 0 ) ;
		matrix.setRowFromFloats( 3 , -pivot.x , -pivot.y , -pivot.z , 1 ) ;
		matrix.multiplyToRef( worldMatrix , worldMatrix ) ;
	} ) ;
	*/

	console.warn( 'Mesh:' , mesh ) ;

	this.updateMeshNeeded = false ;
	return mesh ;
} ;



// Size, positioning and rotation
GEntitySprite.prototype.updateTransform = function( data ) {
	console.warn( "3D GEntitySprite.updateTransform()" , data ) ;
	var mesh = this.babylon.mesh ,
		scene = this.gScene.babylon.scene ;

	if ( data.position ) {
		this.position = data.position ;

		if ( data.transition ) {
			console.warn( "mesh:" , mesh ) ;
			// Animation using easing

			data.transition.createAnimation(
				scene ,
				mesh ,
				'position' ,
				Babylon.Animation.ANIMATIONTYPE_VECTOR3 ,
				new Babylon.Vector3( this.position.x , this.position.y , this.position.z )
			) ;
		}
		else {
			mesh.position.set( this.position.x , this.position.y , this.position.z ) ;
		}
	}

	if ( data.size ) {
		this.size = data.size ;
		mesh.scaling.x = this.size.x ;
		mesh.scaling.y = this.size.y ;
	}

	if ( data.rotation ) {
		this.rotation = data.rotation ;
		mesh.rotation.z = this.rotation.z ;
	}
} ;

