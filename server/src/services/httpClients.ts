import http from "node:http";
import https from "node:https";
import axios, { type AxiosInstance, type CreateAxiosDefaults } from "axios";
import { getMaxFreeHttpSockets, getMaxHttpSockets } from "./envConfig.js";

const keepAliveAgent = new http.Agent({
	keepAlive: true,
	maxSockets: getMaxHttpSockets(),
	maxFreeSockets: getMaxFreeHttpSockets()
});
const keepAliveHttpsAgent = new https.Agent({
	keepAlive: true,
	maxSockets: getMaxHttpSockets(),
	maxFreeSockets: getMaxFreeHttpSockets()
});

const commonOptions: CreateAxiosDefaults = {
	timeout: 8000,
	maxRedirects: 0,
	validateStatus: () => true,
	responseType: "text",
	httpAgent: keepAliveAgent,
	httpsAgent: keepAliveHttpsAgent,
	headers: {
		"User-Agent": "FreeSEOChecker/0.1 (+https://github.com/Ju8z/free-seo)",
		"Accept":
			"text/html,application/xhtml+xml,application/xml,text/plain;q=0.9,*/*;q=0.8",
	},
	transitional: {
		clarifyTimeoutError: true,
	},
};

export const pageFetchClient: AxiosInstance = axios.create({
	...commonOptions,
	timeout: 10000,
	maxContentLength: 2_500_000,
});

export const redirectProbeClient: AxiosInstance = axios.create({
	...commonOptions,
	timeout: 6000,
	maxContentLength: 256_000,
});

export const utilityClient: AxiosInstance = axios.create({
	...commonOptions,
	timeout: 7000,
	maxContentLength: 2_000_000,
});
