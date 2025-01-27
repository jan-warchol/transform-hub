import { LogLevel } from "./object-logger";

export type ContainerConfiguration = {
    /**
     * Docker image to use.
     */
    image: string;

    /**
     * Maximum memory container can allocate (megabytes).
     */
    maxMem: number;
}

export type ContainerConfigurationWithExposedPorts = {
    /**
     * Host IP address that the container's port is mapped to.
     */
    hostIp: string;

    /**
    * Host port number that the container's port is mapped to.
    */
    exposePortsRange: [number, number]
}

/**
 * PreRunner container configuration.
 */
export type PreRunnerContainerConfiguration = ContainerConfiguration;

/**
 * Runner container configuration.
 */
export type RunnerContainerConfiguration = ContainerConfiguration & ContainerConfigurationWithExposedPorts;

/**
 * Host process configuration.
 */
export type HostConfig = {
    /**
     * Hostname.
     */
    hostname: string;

    /**
     * Custom host identifier.
     */
    id?: string;

    /**
     * API port.
     */
    port: number;

    /**
     * API URL.
     */
    apiBase: string;

    /**
     * Port number for connecting Instances.
     */
    instancesServerPort: number;

    /**
     * Host information filepath.
     */
    infoFilePath: string;
}

export type K8SAdapterConfiguration = {
    namespace: string,
    authConfigPath?: string,
    sthPodHost: string,
    runnerImages: { python3: string, node: string },
    sequencesRoot: string,
    timeout?: string,
    runnerResourcesRequestsMemory?: string,
    runnerResourcesRequestsCpu?: string,
    runnerResourcesLimitsMemory?: string,
    runnerResourcesLimitsCpu?: string
}

export type STHConfiguration = {
    /**
     * Logging level.
     */
    logLevel: LogLevel

    /**
     * Enable colors in logging.
     */
    logColors: boolean,

    /**
     * CPM url.
     */
    cpmUrl: string;

    /**
     * Path to the certificate authority file for verifying self-signed CPM certs
     */
    cpmSslCaPath?: string;

    /**
     * CPM id.
     */
    cpmId: string;

    /**
     * Docker related configuration.
     */
    docker: {
        /**
         * PreRunner container configuration.
         */
        prerunner: PreRunnerContainerConfiguration,

        /**
         * Runner container configuration.
         */
        runner: RunnerContainerConfiguration,
        runnerImages: {
            python3: string,
            node: string,
        },
    },

    /**
     * Host configuration.
     */
    host: HostConfig;

    /**
     * Minimum requirements to start new Instance.
     */
    instanceRequirements: {
        /**
         * Free memory required to start Instance. In megabytes.
         */
        freeMem: number;

        /**
         * Required free CPU. In percentage.
         */
        cpuLoad: number;

        /**
         * Free disk space required to start Instance. In megabytes.
         */
        freeSpace: number;
    },

    /**
     * The amount of memory that must remain free.
     */
    safeOperationLimit: number;

    /**
     * Should we identify existing sequences.
     */
    identifyExisting: boolean;

    /**
     * Time to wait after Runner container exit.
     * In this additional time Instance API is still available.
     */
    instanceAdapterExitDelay: number;

    /**
     * Which sequence and instance adapters should STH use.
     * One of 'docker', 'process', 'kubernetes'
     */
    runtimeAdapter: string,

    /**
     * Kubernetes adapter configuration
     */
    kubernetes: Partial<K8SAdapterConfiguration>

    /**
     * Only used when `noDocker` is true
     * Where should ProcessSequenceAdapter save new Sequences
     */
    sequencesRoot: string,

    /**
     * Provides the location of a config file with the list of sequences
     * to be started along with the host
     */
    startupConfig: string,

    /**
     * Should the hub exit when the last instance ends
     */
    exitWithLastInstance: boolean,

    /**
     * Heartbeat interval in miliseconds
     */
    heartBeatInterval: number,
}

export type PublicSTHConfiguration = Omit<Omit<Omit<STHConfiguration, "sequencesRoot">, "cpmSslCaPath">, "kubernetes"> & {
    kubernetes: Omit<Omit<Partial<K8SAdapterConfiguration>, "authConfigPath">, "sequencesRoot">
};
