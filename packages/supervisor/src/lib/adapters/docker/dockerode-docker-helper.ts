import * as Dockerode from "dockerode";
import { PassThrough } from "stream";
import {
    DockerAdapterRunConfig,
    DockerAdapterRunResponse,
    DockerAdapterStreams, DockerAdapterVolumeConfig,
    DockerAdapterWaitOptions,
    DockerContainer,
    IDockerHelper, DockerImage, DockerVolume, ExitData
} from "./types";

type DockerodeVolumeMountConfig = {
    Target: string,
    Source: string,
    Type: "volume" | "bind",
    ReadOnly: boolean
}

export class DockerodeDockerHelper implements IDockerHelper {
    dockerode: Dockerode;

    constructor() {
        this.dockerode = new Dockerode();
    }

    translateVolumesConfig(volumeConfigs: DockerAdapterVolumeConfig[]): DockerodeVolumeMountConfig[] {
        return volumeConfigs.map(cfg => {
            if ("bind" in cfg)
                return {
                    Target: cfg.mountPoint,
                    Source: cfg.bind,
                    Type: "bind",
                    ReadOnly: false
                };
            return {
                Target: cfg.mountPoint,
                Source: cfg.volume,
                Type: "volume",
                ReadOnly: false
            };
        });
    }

    async createContainer(
        dockerImage: DockerImage,
        volumes: DockerAdapterVolumeConfig[] = [],
        binds: string[] = [],
        envs: string[] = [],
        autoRemove: boolean = false,
        maxMem: number = 64 * 1024 * 1024
    ): Promise<DockerContainer> {
        const { id } = await this.dockerode.createContainer({
            Image: dockerImage,
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            Tty: false,
            OpenStdin: true,
            StdinOnce: true,
            Env: envs,
            HostConfig: {
                Binds: binds,
                Mounts: this.translateVolumesConfig(volumes),
                AutoRemove: autoRemove,
                Memory: maxMem
            }
        });

        return id;
    }

    startContainer(containerId: DockerContainer): Promise<void> {
        return this.dockerode.getContainer(containerId).start();
    }

    stopContainer(containerId: DockerContainer): Promise<void> {
        return this.dockerode.getContainer(containerId).stop();
    }

    removeContainer(containerId: DockerContainer): Promise<void> {
        return this.dockerode.getContainer(containerId).remove();
    }

    stats(containerId: DockerContainer): Promise<Dockerode.ContainerStats> {
        return this.dockerode.getContainer(containerId).stats({ stream: false });
    }

    async createVolume(name: string = ""): Promise<DockerVolume> {
        return this.dockerode.createVolume({
            Name: name,
        }).then((volume: Dockerode.Volume) => {
            return volume.name;
        });
    }

    async removeVolume(volumeId: DockerVolume): Promise<void> {
        return this.dockerode.getVolume(volumeId).remove();
    }

    async attach(container: DockerContainer, opts: any): Promise<any> {
        return this.dockerode.getContainer(container).attach(opts);
    }

    async run(config: DockerAdapterRunConfig): Promise<DockerAdapterRunResponse> {
        const streams: DockerAdapterStreams = {
            stdin: new PassThrough(),
            stdout: new PassThrough(),
            stderr: new PassThrough()
        };
        const container = await this.createContainer(
            config.imageName,
            config.volumes,
            config.binds,
            config.envs,
            config.autoRemove,
            config.maxMem);
        // ------
        const stream = await this.attach(container, {
            stream: true,
            stdin: true,
            stdout: true,
            stderr: true,
            hijack: true
        });

        stream.on("close", () => {
            streams.stdout.emit("end");
            streams.stderr.emit("end");
        });

        await this.startContainer(container);

        streams.stdin.pipe(stream);

        this.dockerode.getContainer(container)
            .modem.demuxStream(stream, streams.stdout, streams.stderr);

        return {
            streams: streams,
            containerId: container,
            wait: async () => this.wait(container, { condition: "not-running" })
        };
    }

    async wait(container: DockerContainer, options: DockerAdapterWaitOptions): Promise<ExitData> {
        const containerExitResult = await this.dockerode.getContainer(container).wait(options);

        return { statusCode: containerExitResult.StatusCode };
    }
}
