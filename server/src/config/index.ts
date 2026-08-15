import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
};

// Role hierarchy, lowest level index = top of the org.
// CSO (Chief Sales Officer) > GM (General Manager Sales) > RM (Regional Manager)
// > UM (Unit Manager) > AM (Area Manager) > TSO (Territory Sales Officer/Executive)
// > OB (Order Booker / Presales) > DISTRIBUTOR (portal-only login).
export const ROLE_LEVELS: Record<string, number> = {
  ADMIN: 0,
  CSO: 1,
  GM: 2,
  RM: 3,
  UM: 4,
  AM: 5,
  TSO: 6,
  OB: 7,
  DISTRIBUTOR: 8,
};

// Territory level a given field/management role operates at. Admin, CSO, GM
// are not pinned to a single sub-national node (CSO/GM manage the National node).
export const ROLE_TERRITORY_LEVEL: Record<string, string | null> = {
  ADMIN: null,
  CSO: 'NATIONAL',
  GM: 'NATIONAL',
  RM: 'REGION',
  UM: 'SUB_REGION',
  AM: 'AREA',
  TSO: 'TERRITORY',
  OB: 'TERRITORY',
  DISTRIBUTOR: null,
};

export const NON_PRODUCTIVE_DAYS = 30;
