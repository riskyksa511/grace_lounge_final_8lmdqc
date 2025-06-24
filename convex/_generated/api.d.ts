/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as admin from "../admin.js";
import type * as adminActions from "../adminActions.js";
import type * as auth from "../auth.js";
import type * as dailyEntries from "../dailyEntries.js";
import type * as http from "../http.js";
import type * as images from "../images.js";
import type * as migrations from "../migrations.js";
import type * as monthlyPurchases from "../monthlyPurchases.js";
import type * as router from "../router.js";
import type * as userProfiles from "../userProfiles.js";
import type * as userSummary from "../userSummary.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  adminActions: typeof adminActions;
  auth: typeof auth;
  dailyEntries: typeof dailyEntries;
  http: typeof http;
  images: typeof images;
  migrations: typeof migrations;
  monthlyPurchases: typeof monthlyPurchases;
  router: typeof router;
  userProfiles: typeof userProfiles;
  userSummary: typeof userSummary;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
