
import {popups} from './popups.js';

class boardControl extends Popup{
	canvas = window.game;
	ctx = this.canvas.getContext( '2d' );

	constructor() {
		super();
		this.canvas.width = 1024;
		this.canvas.height = 1024;
	}
}