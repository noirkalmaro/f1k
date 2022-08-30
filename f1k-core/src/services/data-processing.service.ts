import { Lap } from '../entities/lap';
import { DATA_CODES } from '../enums/data-code.enum';
import { LapDataOffsets } from '../enums/lap-data-offset.enum';
import { LAP_IDS } from '../enums/lap-id.enum';
import { LAP_TYPES } from '../enums/lap-types.enum';
import { PILOT_IDS } from '../enums/pilot-ids.enum';
import { CompetitorStates } from '../types/competitor-state.interface';
import { RaceParams } from '../types/race-params.interface';
import { TeamChange, TeamChanges } from '../types/team-changes.interface';
import { formatDayTime, formatLapTime } from '../utils/utils';

export class DataProcessingService {
	public changeTeamDrivers(teamChangesSet: { [key: number]: TeamChange }, lap: Lap, isPitInLap: boolean): void {
		const lapTypeId = isPitInLap ? LAP_IDS.PITIN_LAP_ID : LAP_IDS.PITOUT_LAP_ID;
		const pilotOrderId = isPitInLap ? PILOT_IDS.OLD_PILOT_ID : PILOT_IDS.NEW_PILOT_ID;

		for (let teamChangeId in teamChangesSet) {
			let teamChange = teamChangesSet[teamChangeId];

			if (teamChange[lapTypeId] === lap.id) {
				lap.pilotId = teamChange[pilotOrderId];
				break
			}
		}
	}

	public updateLaps(dataView: DataView /* t */, competitorStates: CompetitorStates, teamChanges: TeamChanges): {
		competitorStates: CompetitorStates,
		teamChanges: TeamChanges
	} {
		let initialByteOffset = 8; //r
		let { byteLength } = dataView; //s
		let dataMap = {} as any // a

		for (let byteOffset = initialByteOffset /* i */; byteOffset < byteLength; byteOffset += 52) {
			let competitorId = dataView.getInt32(byteOffset, true) as any; // e

			if (!dataMap[competitorId]) {
				dataMap[competitorId] = [];
			}

			if (!(competitorStates as any)[competitorId as any]) {
				// TODO: convert into class
				(competitorStates as any)[competitorId] = {
					doLoad: true,
					lapsdata: [],
					_current_lap_time: '',
					_session_time: {
						fail: false,
						formatLapTime: '',
						pitState: false
					},
					_pit_time: {
						formatLapTime: '',
						fail: false
					}
				};
			}

			const competitorState = (competitorStates as any)[competitorId]; // r

			if (!competitorState.lapsdata) {
				competitorState.lapsdata = [];
			}

			const competitorLaps = competitorState.lapsdata
			const lapId = dataView.getInt32(byteOffset + LapDataOffsets.lapId, true); // s
			const lapTimestampValue = dataView.getUint32(byteOffset + LapDataOffsets.timeSlice1, true) +
				4294967296 * dataView.getUint32(byteOffset + LapDataOffsets.timeSlice2, true);

			const lap = new Lap(
				lapId,
				dataView.getInt32(byteOffset + LapDataOffsets.lapNum, true),
				dataView.getInt32(byteOffset + LapDataOffsets.raceLapNum, true),
				dataView.getInt32(byteOffset + LapDataOffsets.lapPos, true),
				dataView.getInt32(byteOffset + LapDataOffsets.lapTime, true),
				new Date(lapTimestampValue),
				dataView.getInt32(byteOffset + 44, true)
			);

			lap.sectors.s1 = dataView.getInt32(byteOffset + LapDataOffsets.s1);
			lap.sectors.s2 = dataView.getInt32(byteOffset + LapDataOffsets.s2);
			lap.sectors.s3 = dataView.getInt32(byteOffset + LapDataOffsets.s3);
			lap.sectors.s4 = dataView.getInt32(byteOffset + LapDataOffsets.s1);

			competitorLaps[lapId] = lap;
			dataMap[competitorId].push(lapId);

			if (lap.lapFlags & LAP_TYPES.LAP_TYPE_PITIN) {
				this.changeTeamDrivers((teamChanges as any)[competitorId], lap, true);
			} else if (lap.lapFlags & LAP_TYPES.LAP_TYPE_PITOUT) {
				this.changeTeamDrivers((teamChanges as any)[competitorId], lap, false);
			}
		}

		// Dont forget about this part on presenter
		//   if (null != competitorLapsDiv)
		// 	  if (-1 != teamId)
		// 		  updateLapsList(a[teamId], teamId);
		// 	  else
		// 		  for (let e in a)
		// 			  e == competitorLapsDiv.competitorId && updateLapsList(a[e], e)

		return {
			competitorStates,
			teamChanges
		};
	}

	public updateSessions(
		sessionUpdate: { [key: string]: { [key: string]: number } },
		competitorStates: CompetitorStates,
		raceParams: RaceParams
	): CompetitorStates {
		for (let competitorId in sessionUpdate) {
			let competitorState = competitorStates[competitorId]; // t
			// if ("undefined" != typeof teamManager && compId == teamId && updateTeamSession(e[compId], t),
			// t) {
			let sessionUpdateSet = sessionUpdate[competitorId]; // a
			for (let key in sessionUpdateSet) {
				const value = sessionUpdateSet[key]; // e
				(competitorState as any)[key] = value;

				if (+key === DATA_CODES.SESSION_TIME) {
					if (6 !== (competitorState as any)[DATA_CODES.COMPETITOR_STATE] && 7 !== (competitorState as any)[DATA_CODES.COMPETITOR_STATE]) {
						if (competitorState._session_time) { // a
							competitorState._session_time.pitState = false;
							competitorState._session_time.formatLapTime = formatLapTime(value, 0, 1);
							const minST = raceParams.minimalSessionTime;
							const maxST = raceParams.maximalSessionTime;
							competitorState._session_time.fail = !!(minST > 0 && value < 6e4 * minST || maxST > 0 && value > 6e4 * maxST);
						}
					}
				} else if (+key === DATA_CODES.CURRENT_LAP_TIME && competitorState._current_lap_time) {
					competitorState._current_lap_time = formatLapTime(value);
				}
			}
			// compId == teamId && teamUpdateSession(t)
		}

		return competitorStates;
	}

	public updatePitlanes(
		pitlaneUpdates: { [key: string]: { [key: string]: number } },
		competitorStates: CompetitorStates,
		raceParams: RaceParams
	): CompetitorStates {
		for (const competitorId in pitlaneUpdates) {
			const competitorState = competitorStates[competitorId]; // t

			if (competitorState) {
				const update = pitlaneUpdates[competitorId];

				for (const key in update) {
					const updateValue = update[key]; // e
					(competitorState as any)[key] = updateValue;

					if (+key === DATA_CODES.PIT_TIME) {
						let fail = false;

						if (raceParams.minimalPitTime && updateValue > 0 && updateValue < 1e3 * raceParams.minimalPitTime) {
							fail = true;
						}
						competitorState._pit_time = {
							formatLapTime: formatLapTime(updateValue, 1),
							fail
						}
					}
				}
			}
		}

		return competitorStates;
	}

	public updateDrivers(
		driversUpdate: any,
		competitorStates: CompetitorStates,
		raceDrivers: any,
		teamChanges: TeamChanges
	): void {
		for (const driverId in driversUpdate) {
			if (!raceDrivers[driverId]) {
				raceDrivers[driverId] = {};
			}

			const raceDriver = raceDrivers[driverId]; // t
			const update = driversUpdate[driverId]; // a

			for (const key in update) {
				raceDriver[key] = update[key];

				if (+key === DATA_CODES.CMD_ACTION && update[key] === 'DELETE') {
					delete raceDrivers[driverId];
				} else if (raceDriver[DATA_CODES.TEAM_ID]) {
					const teamChange = teamChanges[raceDriver[DATA_CODES.TEAM_ID]]; // e

					if (teamChange) {
						const a = [];

						for (const changeSetKey in teamChange) {
							const changeSet = teamChange[changeSetKey]; // r

							if (changeSet[DATA_CODES.OLD_PILOT_ID] === +driverId) {
								changeSet._srcDriver = raceDriver[DATA_CODES.NAME];
							}

							if (changeSet[DATA_CODES.NEW_PILOT_ID] === +driverId) {
								changeSet._dstPilot = raceDriver[DATA_CODES.NAME];
							}

							if (changeSet[DATA_CODES.PITIN_LAP_ID]) {
								const pitInLapId = changeSet[DATA_CODES.PITIN_LAP_ID]; // e

								if (competitorStates[raceDriver[DATA_CODES.TEAM_ID]]?.lapsdata) {
									const pitInLap = competitorStates[raceDriver[DATA_CODES.TEAM_ID]]?.lapsdata[pitInLapId];

									if (pitInLap.pilotId === +driverId) {
										a.push(pitInLapId);
									}
								}
							}

							if (changeSet[DATA_CODES.PITOUT_LAP_ID]) {
								const pitOutLapId = changeSet[DATA_CODES.PITOUT_LAP_ID]; // e

								if (competitorStates[raceDriver[DATA_CODES.TEAM_ID]]?.lapsdata) {
									const pitOutLap = competitorStates[raceDriver[DATA_CODES.TEAM_ID]]?.lapsdata[pitOutLapId];

									if (pitOutLap.pilotId === +driverId) {
										a.push(pitOutLapId);
									}
								}
							}
						}
						// updateLapsList(a, t[TEAM_ID])
					}
				}
			}
		}

		// "undefined" != typeof teamManager && teamPilotsUpdated(e)
	}

	public updateTeams(teamUpdates: any, raceTeams: any): any {
		for (const teamId in teamUpdates) { // t
			if (!raceTeams[teamId]) {
				raceTeams[teamId] = {};
			}

			const team = raceTeams[teamId]; // a
			const update = teamUpdates[teamId];

			for (const key in update) {
				team[key] = update[key];

				if (+key === DATA_CODES.CMD_ACTION && update[key] === 'DELETE') {
					delete raceTeams[teamId];
				}
			}
		}

		// 	"undefined" != typeof teamManager && teamTeamsUpdated()

		return raceTeams;
	}

	public updateIntervals(intervalUpdates: any, teamIntervals: any): any {
		for (const intervalId in intervalUpdates) { // t
			if (!teamIntervals[intervalId]) {
				teamIntervals[intervalId] = {};
			}

			const teamsInterval = teamIntervals[intervalId]; // a
			const competitorsUpdate = intervalUpdates[intervalId]; // r

			for (const competitorId in competitorsUpdate) {
				if (-1 === +competitorId && competitorsUpdate[competitorId][DATA_CODES.CMD_ACTION] === 'DELETE') {
					delete teamIntervals[intervalId];
					break;
				}

				if (!teamsInterval[competitorId] && +competitorId !== -1) {
					teamsInterval[competitorId] = {};
				}

				const interval = teamsInterval[competitorId]; // s
				const update = competitorsUpdate[competitorId]; // e

				for (const key in update) {
					if (+key == DATA_CODES.CMD_ACTION && 'DELETE' == update[key]) {
						delete teamsInterval[competitorId];
						break
					}
					interval[key] = update[key];
				}
			}

			// t == teamId && teamUpdateIntervals(r)
		}

		return teamIntervals;
	}

	public updateChanges(
		changesUpdate: any,
		competitorStates: CompetitorStates,
		teamChanges: TeamChanges,
		raceDrivers: any,
		raceParams: RaceParams,
		pilotChangesTable: any
	): void {
		for (let competitorId in changesUpdate) { // t
			// if ("undefined" != typeof teamManager) {
			// 	if (t != teamId)
			// 		continue;
			// 	teamUpdateSessions(e[t])
			// }

			if (!teamChanges[competitorId]) {
				teamChanges[competitorId] = {};
			}

			const teamChangesSet = teamChanges[competitorId]; // r
			const teamUpdates = changesUpdate[competitorId]; // a

			for (let numOrder in teamUpdates) {
				if (0 == +numOrder) {
					continue;
				}

				if (+numOrder === -1 && teamUpdates[numOrder][DATA_CODES.CMD_ACTION] === 'DELETE') {
					delete pilotChangesTable['.changeItem_' + competitorId];
					delete teamChanges[competitorId];

					break;
				}

				if (!teamChangesSet[numOrder]) {
					// TODO: convert to class
					teamChangesSet[numOrder] = {
						[LAP_IDS.PITIN_LAP_ID]: 0,
						[LAP_IDS.PITOUT_LAP_ID]: 0,
						[PILOT_IDS.OLD_PILOT_ID]: 0,
						[PILOT_IDS.NEW_PILOT_ID]: 0,
						_srcDriver: '',
						_dstPilot: '',
						_changeTime: '',
						_session_time: {
							pitState: false,
							formatLapTime: '',
							fail: false,
						},
						_changePitTime: {
							formatLapTime: '',
							fail: false,
						}
					};
				}

				const update = teamUpdates[numOrder]; // e
				const teamChange = teamChangesSet[numOrder]; // s

				// if (+numOrder !== -1) {
				// 	const changesDataRow = { // a
				// 		changeItem: competitorId,
				// 		numOrder,
				// 	};
				// 	// loadResultDivs(s, a); 

				// 	pilotChangesTable['.changeItem_' + competitorId] = changesDataRow;

				// 	const competitorState = competitorStates[competitorId]; // l
				// }

				// {
				// 	let a = changesDataRowTemplate.cloneNode(!0);
				// 	addClass(a, "changeItem_" + t),
				// 	addClass(a, "numOrder_" + numOrder),
				// 	loadResultDivs(s, a);
				// 	let r = findInsertChangeRow(e[CHANGE_TIME], pilotChangesTable);
				// 	null == r ? pilotChangesTable.appendChild(a) : pilotChangesTable.insertBefore(a, r),
				// 	s.row = a,
				// 	a.style.display = "table-row";
				// 	let l = competitorStates[t]
				// 	  , i = s["#teamNum"];
				// 	i && (i.innerHTML = l ? l[NUM] : ""),
				// 	(i = s["#teamName"]) && (i.innerHTML = l ? l[TEAM_NAME] : ""),
				// 	(i = s["#changeNum"]) && (i.innerHTML = numOrder)
				// }

				for (let key in update) {
					(teamChange as any)[key] = update[key]; // a

					if (+key === DATA_CODES.CMD_ACTION && update[key] === 'DELETE') {
						delete teamChangesSet[numOrder];

						break;
					}

					if (+key === DATA_CODES.CHANGE_TIME) {
						teamChange._changeTime = formatDayTime(update[key] / 1e3, false)
					} else if (+key == DATA_CODES.OLD_PILOT_ID) {
						teamChange._srcDriver = raceDrivers[update[key]] ? raceDrivers[update[key]][DATA_CODES.NAME] : '';
					} else if (+key == DATA_CODES.NEW_PILOT_ID) {
						teamChange._dstPilot = raceDrivers[update[key]] ? raceDrivers[update[key]][DATA_CODES.NAME] : '';
					} else if (+key == DATA_CODES.SESSION_TIME) {
						const minTime = raceParams.minimalSessionTime;
						const maxTime = raceParams.maximalSessionTime;

						teamChange._session_time = {
							pitState: false,
							formatLapTime: formatLapTime(update[key], 1),
							fail: minTime > 0 && update[key] < 6e4 * minTime || maxTime > 0 && update[key] > 6e4 * maxTime,
						};
					} else if (+key == DATA_CODES.PIT_TIME) {
						teamChange._changePitTime = {
							formatLapTime: formatLapTime(update[key], 1),
							fail: !!raceParams.minimalPitTime && (update[key] < 1e3 * raceParams.minimalPitTime && update[key] > 0),
						};
					} else if (+key == DATA_CODES.PITIN_LAP_ID) {
						const competitorState = competitorStates[competitorId]; // r
						if (competitorState?.lapsdata) {
							let pitInLap = competitorState?.lapsdata[update[key]];
							if (pitInLap) {
								pitInLap.pilotId = update[DATA_CODES.OLD_PILOT_ID];
								// updateLapsList([a], t)
							}
						}
					} else if (+key == DATA_CODES.PITOUT_LAP_ID) {
						const competitorState = competitorStates[competitorId]; // r
						if (competitorState?.lapsdata) {
							let pitInLap = competitorState?.lapsdata[update[key]];
							if (pitInLap) {
								pitInLap.pilotId = update[DATA_CODES.NEW_PILOT_ID];
								// updateLapsList([a], t)
							}
						}
					}
				}
			}
		}
	}
}
