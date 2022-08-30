export class Lap {
	public sectors = {
		s1: 0,
		s2: 0,
		s3: 0,
		s4: 0,
	};

	public pilotId: number | undefined;

	constructor(
		public id: number,
		public raceLapNum: number,
		public lapNum: number,
		public lapPos: number,
		public lapTime: number,
		public lapTs: Date,
		public lapFlags: number,
	) {}
}
