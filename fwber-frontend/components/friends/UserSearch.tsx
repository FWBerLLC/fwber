'use client';

interface UserSearchProps {
  searchResults: any[];
  onSendRequest: (userId: number) => void;
}

export default function UserSearch({ searchResults, onSendRequest }: UserSearchProps) {
  return (
    <div className="space-y-4">
      {searchResults.map((user) => (
        <div key={user.id} className="flex items-center justify-between p-4 bg-card dark:bg-card rounded-lg shadow">
          <div>
            <p className="font-semibold">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <button type="button"
            onClick={() => onSendRequest(user.id)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
          >
            Send Request
          </button>
        </div>
      ))}
    </div>
  );
}
