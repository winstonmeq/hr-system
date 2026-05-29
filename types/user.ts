export interface UserListItem {
  _id: string;

  email: string;

  name: {
    first: string;
    middle?: string;
    last: string;
  };

  role?: {
    _id: string;
    name: string;
    slug: string;
  };

  status: "active" | "inactive" | "suspended";

  lastLoginAt?: Date;

  createdAt: Date;
}