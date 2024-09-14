import {Vector} from "./relativistic.util.js"
import {params} from "./relativistic.util.js"
const C = params.C;
const CC = C*C;
export function gammaFromFL(V) {
	return Math.sqrt( CC/(V*V+CC))
}


export function RealTime( T_o, V, P, V_o, P_o ) {
	const tmp = P.sub(P_o.add(V_o.times(T_o)));
	const tmp2 = tmp.dot( V )
	const del = P.sub(P_o.add(V_o.times(T_o))).add( V.times(T_o)).length();
	const A = C*C*T_o;
	const tmp3 = tmp.dot( V );
	const T1 = (C*tmp2.len()+A+tmp2)/(C*C-V.dot(V));
	const T2 = (-C*tmp2.len()-A+tmp2)/(C*C-V.dot(V));
	if( T2 < T_o ) return [T2,T1];
	if( T1 < T_o ) return [T1];
	return 0;
	/*
	const p_x = (P.x - P_o.x);
	const p_y = (P.y - P_o.y);
	const p_z = (P.z - P_o.z);

	const D = C*C-(V.x*V.x+V.y*V.y+V.z*V.z); // C, V_E
	const px = p_x + (V.x- V_o.x)*T_o ;
	const py = p_y + (V.y- V_o.y)*T_o ;
	const pz = p_z + (V.z- V_o.z)*T_o ;

	const T1 = ( -C*Math.sqrt( px*px+py*py+pz*pz ) + ( p_x * V.x  +  p_y*V.y  +  p_z*V.z ) + (C*C-(V.x*V_o.x+V.y*V_o.y+V.z*V_o.z))* T_o )/D;
	const T2 = ( C*Math.sqrt( px*px+py*py+pz*pz ) + ( p_x * V.x  +  p_y*V.y  +  p_z*V.z ) + (C*C-(V.x*V_o.x+V.y*V_o.y+V.z*V_o.z))* T_o )/D;
	if( T2 < T_o ) return [T2,T1];
	if( T1 < T_o ) return [T1];
	*/
	return 0;

	//return [ (- C*Math.sqrt( px*px+py*py+pz*pz ) + ( p_x * V.x  +  p_y*V.y  +  p_z*V.z ) + (C*C-(V.x*V_o.x+V.y*V_o.y+V.z*V_o.z))* T_o )/D ];
}
