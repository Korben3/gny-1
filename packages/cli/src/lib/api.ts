import axios from 'axios';
import * as program from 'commander';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

export function pretty(obj: any) {
  return JSON.stringify(obj, null, 2);
}

export const http = axios.create();

export interface ApiOptions {
  host: string;
  port: number;
}

export type ApiConfig = Partial<program.CommanderStatic> & ApiOptions;

export async function get(url, params?) {
  try {
    const { data } = await http.get(url, {
      params: params,
    });
    console.log(pretty(data));
  } catch (error) {
    console.log(error.response ? error.response.data : error.message);
  }
}

export async function post(url, params) {
  try {
    const { data } = await http.post(url, params, config);
    console.log(pretty(data));
  } catch (error) {
    console.log(error.response ? error.response.data : error.message);
  }
}

export default {
  get: get,
  post: post,
};
