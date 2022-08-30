import { CompetitorStates } from '../types/competitor-state.interface';
import { ModelEmitter } from '../types/emitter.interface';
import { ProcessingService } from '../types/processing-service.interface';
import { RaceParams } from '../types/race-params.interface';
import { TeamChanges } from '../types/team-changes.interface';
import { ab2str } from '../utils/utils';

export class RaceDataModel {
	public competitorStates: CompetitorStates = {};
	public teamChanges: TeamChanges = {};
	public raceTeams = {} as any;
	public raceDrivers = {} as any;
	public teamIntervals = {} as any;
	public raceParams: RaceParams = {} as any;
	public teamId = -1;

	constructor(
		protected ws: any,
		protected processingService: ProcessingService,
		protected emitter: ModelEmitter
	) {
		ws.on('message', (msg: any) => {
			this.processSocketData(msg);
		});

		ws.on('close', () => {
			this.emitter.emit('websocket-closed');
		});
	}

	public updateSocket(ws: any): void {
		this.ws = ws;
	}

	public processSocketData(message: { data: string | ArrayBuffer }): void {
		if (message.data instanceof ArrayBuffer) {
			let dataView = new DataView(message.data);

			if ("BINLAPS:" == ab2str(message.data.slice(0, 8))) {
				this.processingService.updateLaps(dataView, this.competitorStates, this.teamChanges);
			}
		} else {
			try {
				const jsonData = JSON.parse(message.data);
				this.updateData(jsonData);

				if (jsonData.req_answ) {
					this.emitter.emit('processHostData', jsonData.req_answ)
				}
			} catch (e) {
				console.error(e);
			}
		}
	}

	public updateData(data: any): void {
		// let updateFinishParam = false;
		// let updateTotalBestLap = false;
		// let prevBestLapCompetitorId = -1;

		if (data.request === 'notify' && data.msg === 'update_archive') {
			this.emitter.emit('reloadRecords');
		}

		if (data.command === 'clear') {
			this.emitter.emit('resetRunData');
		}

		if (data.race_command === 'reset_race') {
			this.raceTeams = {};
			this.raceDrivers = {};
			this.raceParams = {} as any;
			this.teamId = -1;
			this.emitter.emit('teamResetRace');
		}

		if (data.removeCompetitors) {
			this.emitter.emit('resetRunData', data.removeCompetitors);
		}

		if (data.removeLaps) {
			this.emitter.emit('removeLaps', data.removeLaps);
		}

		// decide when call presenter update
		// updateRunData(e),
		// this.emitter.emit('runStateUpdated');

		if (data.teamId) {
			this.emitter.emit('updateTeamId', data.teamId);
		}

		this.raceParams = data.raceParams || {};

		this.emitter.emit('teamTeamsUpdated'); // teamTeamsUpdated()

		// this.emitter.emit('updateResults', data.results);
		// this.emitter.emit('updatePitlane', this.processingService.updatePitlanes(data.pitlane, this.competitorStates, this.raceParams));
		// this.emitter.emit('updateSessions', this.processingService.updateSessions(data.sessions, this.competitorStates, this.raceParams));
		// this.emitter.emit('updateComments', data.comments);
		// this.emitter.emit('updatePilots', this.processingService.updateDrivers(data.pilots, this.competitorStates, this.raceDrivers, this.teamChanges));
		// this.emitter.emit('updateTeams', this.processingService.updateTeams(data.teams, this.raceTeams));
		// this.emitter.emit('updateIntervals', this.processingService.updateIntervals(data.intervals, this.teamIntervals));
		// this.emitter.emit('updateChanges', this.processingService.updateChanges(data.changes, this.competitorStates, this.teamChanges, this.raceDrivers, this.raceParams, {}));

		if (data.replaceCompetitors) {
			this.emitter.emit('replaceCompetitors', data.replaceCompetitors);
		}

		// updateTotalBestLap && doUpdateTotalBestLap(),
		// updateFinishParam && doUpdateFinishParam(),
		// processPassings(e.passings),
		// null != e.lapsTail && "undefined" != typeof updateLapsTail && updateLapsTail(e.lapsTail, e.passings)
	}

	public on(eventName: string, listener: (...args: any[]) => void): () => void {
		return this.emitter.on.call(this.emitter, eventName, listener);
	}
}