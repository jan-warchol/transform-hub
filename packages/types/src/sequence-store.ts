import { RunnerConfig } from ".";

/**
 *
 * Sequence type describes the collection
 * of uncompressed developer's code files
 * and the configuration file attached to them
 * residing on certain volume.
 *
 * The configuration file is required to run
 * Sequence Instance.
 *
 * Question: this should probably moved to @scramjet/model, right?
 *
 */

export interface ISequence {
    id: string,
    config: RunnerConfig
}

export interface ISequenceStore {
    sequences: { [key: string]: ISequence };
    getById(id: string): ISequence;
    add(sequence: ISequence): void;
    remove(id: string): void;
}
