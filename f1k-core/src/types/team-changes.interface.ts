import { LAP_IDS } from '../enums/lap-id.enum';
import { PILOT_IDS } from '../enums/pilot-ids.enum';

export interface TeamChange {
	[LAP_IDS.PITIN_LAP_ID]: number,
	[LAP_IDS.PITOUT_LAP_ID]: number,
	[PILOT_IDS.OLD_PILOT_ID]: number,
	[PILOT_IDS.NEW_PILOT_ID]: number,
	_srcDriver: string,
	_dstPilot: string,
	_changeTime: string,
	_session_time: {
		pitState: boolean,
		formatLapTime: string,
		fail: boolean,
	},
	_changePitTime: {
		formatLapTime: string,
		fail: boolean,
	}
}

export interface TeamChanges {
	[key: string]: {
		[key: string]: TeamChange
	}
}
