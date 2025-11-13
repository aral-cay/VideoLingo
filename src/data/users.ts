export interface User {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email: string;
}

export const users: User[] = [
  {
    username: 'Aral',
    password: 'Aral123',
    firstName: 'Aral',
    lastName: 'Cay',
    email: 'aral.cay@example.com',
  },
  {
    username: 'Kabir',
    password: 'Kabir123',
    firstName: 'Kabir',
    lastName: 'Moghe',
    email: 'kabir.moghe@example.com',
  },
  {
    username: 'Luca',
    password: 'Luca123',
    firstName: 'Luca',
    lastName: 'Gandrud',
    email: 'luca.gandrud@example.com',
  },
];

