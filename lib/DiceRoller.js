/*
	3D Ground With Sprites

	Copyright (c) 2020 Cédric Ronvel

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

/*
	https://playground.babylonjs.com/#JJGVMJ#15
	Playground code (at #15)
*/



const meshUtils = require( './meshUtils.js' ) ;



function DiceRoller( gScene , params ) {
	this.gScene = gScene ;

	// Parameters
	this.dieCount = 5 ;
	this.dieSize = 0.2 ;
	this.dieFaceReindex = [ 0 , 5 , 1 , 4 , 2 , 3 ] ;	// Because 1 is opposite of 6, 2 of 5 and 3 of 4
	this.diceRollTimeLimit = 3000 ;	// Force computing the roll after this timelimit
	this.minThrowingPower = 5 ;
	this.arrowLength = 0.4 ;
	this.physicTimeStep = 10 ;
	this.gravity = 20 ;	// Set gravity higher than usual, to scale it with oversized dice
	this.friction = 0.9 ;
	this.restitution = 0.6 ;
	this.cameraHeight = 3.8 ;
	this.wallVisibility = false ;
	this.wallSize = 3 ;
	this.// Good thickness prevents bug of dice escaping the box
	this.wallThickness = 0.5 ;
	// 100 update per seconds (seems to make it deterministic)
	this.stillnessVelocitySumLimit = 0.01 ;

	// Babylon stuffs
	this.babylon = {
		scene: null ,
		physicsEngine: null ,
		camera: null ,
		light: null ,
		diceMaterial: null ,
		arrowMaterial: null ,
		boxFaceUV: null ,
		ui: null
	} ;
}

module.exports = DiceRoller ;



DiceRoller.prototype.init = function() {
	// This creates a basic Babylon Scene object (non-mesh)
	var scene = this.babylon.scene = new BABYLON.Scene( this.gScene.babylon.engine ) ;

	scene.enablePhysics( new BABYLON.Vector3( 0 , - this.gravity , 0 ) ,
		new BABYLON.CannonJSPlugin()
		//new BABYLON.AmmoJSPlugin()
		//new BABYLON.OimoJSPlugin()
	);

	this.babylon.physicsEngine = scene.getPhysicsEngine();
	this.babylon.physicsEngine.setSubTimeStep( this.physicTimeStep );

	// Camera
	var camera = this.babylon.camera = new BABYLON.ArcRotateCamera( 'camera' , - Math.PI / 2 , 0 , this.cameraHeight , BABYLON.Vector3.Zero() , scene ) ;
	camera.wheelPrecision = 1000 ;
	camera.minZ = 0.05 ;
	camera.setTarget( BABYLON.Vector3.Zero() ) ;
	//camera.attachControl(canvas, true);

	// Light
	this.babylon.light = new BABYLON.HemisphericLight( 'light' , new BABYLON.Vector3( -0.3 , 1 , -0.3 ) , scene ) ;
	this.babylon.light.intensity = 0.7 ;

	var groundMat = new BABYLON.StandardMaterial( 'groundMaterial' , scene ) ;
	groundMat.diffuseTexture = new BABYLON.Texture( "http://i.imgur.com/Wk1cGEq.png" , scene ) ;
	groundMat.bumpTexture = new BABYLON.Texture( "http://i.imgur.com/wGyk6os.png" , scene ) ;
	groundMat.diffuseTexture.uScale = groundMat.diffuseTexture.vScale = groundMat.bumpTexture.uScale = groundMat.bumpTexture.vScale = 6 ;

	var diceMat = this.babylon.diceMaterial = new BABYLON.StandardMaterial( 'diceMaterial', scene ) ;
	diceMat.diffuseTexture = new BABYLON.Texture( "https://i.imgur.com/nzFvRJA.png" , scene ) ;

	var arrowMat = this.babylon.arrowMaterial = new BABYLON.StandardMaterial( 'arrowMaterial' , scene ) ;
	arrowMat.diffuseTexture = new BABYLON.Texture( "https://i.imgur.com/VB6SDdj.png" , scene ) ;
	arrowMat.diffuseTexture.hasAlpha = true ;
	arrowMat.backFaceCulling = false ;

 	// Create face UVs for the dice
	var columns = 6;
	this.babylon.boxFaceUV = new Array( 6 ) ;

	for ( let i = 0 ; i < 6 ; i ++ ) {
		let j = this.dieFaceReindex[ i ];
		this.babylon.boxFaceUV[ i ] = new BABYLON.Vector4( j / columns , 0 , ( j + 1 ) / columns , 1 ) ;
	}

	var ground = BABYLON.Mesh.CreateGround("ground", 15, 15, 2, scene);
	ground.material = groundMat ;

	var arrow = BABYLON.MeshBuilder.CreatePlane("arrow", {height:0.5,width:arrowLength}, scene);
	arrow.material = arrowMat ;
	arrow.rotation.x = Math.PI / 2;
	arrow.rotation.y = 0 ;//Math.PI;
	arrow.position.y = 1;
	arrow.position.x = -0.8;

	var nWall = BABYLON.MeshBuilder.CreateBox("north", {width:this.wallSize,height:this.wallSize,depth:this.wallThickness}, scene);
	nWall.position.y = this.wallSize/2;
	nWall.position.z = this.wallSize/2;
	nWall.physicsImpostor = new BABYLON.PhysicsImpostor(nWall, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution , friction }, scene);

	var sWall = BABYLON.MeshBuilder.CreateBox("south", {width:this.wallSize,height:this.wallSize,depth:this.wallThickness}, scene);
	sWall.position.y = this.wallSize/2;
	sWall.position.z = - this.wallSize/2;
	sWall.physicsImpostor = new BABYLON.PhysicsImpostor(sWall, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution , friction }, scene);

	var eWall = BABYLON.MeshBuilder.CreateBox("east", {width:this.wallThickness,height:this.wallSize,depth:this.wallSize}, scene);
	eWall.position.y = this.wallSize/2;
	eWall.position.x = this.wallSize/2;
	eWall.physicsImpostor = new BABYLON.PhysicsImpostor(eWall, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution , friction }, scene);

	var wWall = BABYLON.MeshBuilder.CreateBox("west", {width:this.wallThickness,height:this.wallSize,depth:this.wallSize}, scene);
	wWall.position.y = this.wallSize/2;
	wWall.position.x = - this.wallSize/2;
	wWall.physicsImpostor = new BABYLON.PhysicsImpostor(wWall, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution , friction }, scene);

	var tWall = BABYLON.MeshBuilder.CreateBox("top", {width:this.wallSize,height:this.wallThickness,depth:this.wallSize}, scene);
	tWall.position.y = this.wallSize;
	tWall.physicsImpostor = new BABYLON.PhysicsImpostor(tWall, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution , friction }, scene);

	var bWall = BABYLON.MeshBuilder.CreateBox("bottom", {width:this.wallSize,height:this.wallThickness,depth:this.wallSize}, scene);
	bWall.physicsImpostor = new BABYLON.PhysicsImpostor(bWall, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 0, restitution , friction }, scene);

	if ( ! wallVisibility ) {
		nWall.setEnabled( false ) ;
		sWall.setEnabled( false ) ;
		eWall.setEnabled( false ) ;
		wWall.setEnabled( false ) ;
		tWall.setEnabled( false ) ;
		bWall.setEnabled( false ) ;
	}

	var dice = [] ;
	for ( let i = 0 ; i < dieCount ; i ++ ) {
		let die = BABYLON.MeshBuilder.CreateBox( "die" , { size: dieSize , faceUV: this.babylon.boxFaceUV , wrap: true } , scene ) ;
		die.material = diceMat ;

		let yOffset = Math.round( i / 6 ) ;
		let zOffset = i % 6 ;
		die.position.x = - this.wallSize/2 * 0.5 ;
		die.position.y = this.wallThickness/2 + 0.4 + yOffset * dieSize * 1.2;
		die.position.z = -this.wallSize/2 + 2 * this.wallThickness + zOffset * dieSize * 1.5;
		die.rotation.x = 2 * Math.PI * Math.random();
		die.rotation.y = 2 * Math.PI * Math.random();
		die.rotation.z = 2 * Math.PI * Math.random();

		//die.physicsImpostor = new BABYLON.PhysicsImpostor(die, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 1, restitution , friction }, scene);
		//die.physicsImpostor.setLinearVelocity(new BABYLON.Vector3(-10 - 10*Math.random() , 3 * ( 2 * Math.random() - 1 ) , 8 * ( 2 * Math.random() - 1 )));

		dice.push( die ) ;
	}

	scene.onPointerDown = () => {
		scene.onPointerDown = null ;
		var startAt = Date.now() ,
			direction = new BABYLON.Vector3( 10 , 0 , 0 ) ;

		var timer = setInterval( () => {
			arrow.scaling.x += 0.04 ;
			arrow.position.x += 0.02 * arrowLength ;
			var dnorm = direction.normalizeToNew() ;
			arrow.rotation.y = Math.atan2( dnorm.y , dnorm.x ) ;
		}, 10 );

		scene.onPointerMove = (event) => {
			direction.x += event.movementX ;
			direction.y += event.movementY ;
		} ;

		scene.onPointerUp = () => {
			scene.onPointerUp = scene.onPointerMove = null ;
			clearInterval( timer ) ;
			arrow.setEnabled( false ) ;
			var power = Math.sqrt( ( Date.now() - startAt ) / 1000 ) ;
			
			// Convert the screen Y to the 3D Z
			direction.z = - direction.y ;
			direction.y = 0 ;
			direction.normalize() ;
			direction.y = 0.6 ;   // Force throwing a bit in the up direction
			direction.normalize() ;

			throwDice( power , direction ) ;
		} ;
	} ;

	function throwDice( power , direction ) {
		power = Math.max( 6 * power , minThrowingPower ) ;

		for ( let i = 0 ; i < dieCount ; i ++ ) {
			let die = dice[i] ;
			die.physicsImpostor = new BABYLON.PhysicsImpostor(die, BABYLON.PhysicsImpostor.BoxImpostor, { mass: 1, restitution , friction }, scene);
			die.physicsImpostor.setLinearVelocity(new BABYLON.Vector3( power * direction.x , power * direction.y , power * direction.z ));
		}
		
		setTimeout( checkDiceRolled , 200 ) ;
		setTimeout( computeDiceRoll , diceRollTimeLimit ) ;
	}

	function getDieValue(die) {
		var faceId = meshUtils.getUpmostBoxMeshFace( die ) ;
		return this.dieFaceReindex[ faceId ] + 1 ;
	}

	function isStill(object) {
		var body = object.physicsImpostor.physicsBody;
		var sum = Math.abs( body.velocity.x ) + Math.abs( body.velocity.y ) + Math.abs( body.velocity.z ) +
			Math.abs( body.angularVelocity.x ) + Math.abs( body.angularVelocity.y ) + Math.abs( body.angularVelocity.z ) ;
		console.warn( "velocity sum:" , sum );
		return sum < stillnessVelocitySumLimit ;
	}

	var isRolled = false;

	function checkDiceRolled() {
		if ( isRolled ) { return ; }
		if ( ! dice.every( e => isStill( e ) ) ) {
			setTimeout( checkDiceRolled , 200 ) ;
			return ;
		}
		computeDiceRoll();
	}

	function computeDiceRoll() {
		if ( isRolled ) { return ; }
		isRolled = true ;

		// GUI
		var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
		let text = new BABYLON.GUI.TextBlock();
		var str = "> " , accumulator = 0 ;
		
		for ( let i = 0 ; i < dieCount ; i ++ ) {
			let value = getDieValue( dice[i] ) ;
			accumulator += value ;
			if ( i ) { str += " + " ; }
			str += value ;
		}

		str += " = " + accumulator ;

		text.text = str ;
		text.color = "black";
		text.fontSize = 24;
		text.top = "40%";
		//text.left = "-0%";
		//text.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
		advancedTexture.addControl(text);
	}
} ;

