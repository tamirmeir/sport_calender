import sys
from app import create_app
from extensions import db
from models import User

def list_users():
    users = User.query.all()
    if not users:
        print("No users found.")
        return []
    
    print("\n--- Registered Users ---")
    print(f"{'ID':<5} {'Username':<20} {'Email':<30} {'Joined':<20}")
    print("-" * 75)
    for user in users:
        print(f"{user.id:<5} {user.username:<20} {user.email:<30} {user.created_at.strftime('%Y-%m-%d')}")
    print("-" * 75)
    return users

def delete_user(username):
    user = User.query.filter_by(username=username).first()
    if not user:
        print(f"Error: User '{username}' not found.")
        return
    
    confirm = input(f"Are you sure you want to delete user '{username}' and all their favorites? (y/n): ")
    if confirm.lower() == 'y':
        try:
            db.session.delete(user)
            db.session.commit()
            print(f"Success: User '{username}' deleted.")
        except Exception as e:
            print(f"Error deleting user: {e}")
            db.session.rollback()
    else:
        print("Operation cancelled.")

def main():
    app = create_app()
    with app.app_context():
        # Create tables if they don't exist (just in case)
        db.create_all()
        
        while True:
            users = list_users()
            if not users:
                break
                
            choice = input("\nEnter username to delete (or press Enter to exit): ").strip()
            if not choice:
                break
            
            delete_user(choice)
            print("\n")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "list":
            app = create_app()
            with app.app_context():
                list_users()
        else:
            # Assume argument is username to delete
            username = command
            app = create_app()
            with app.app_context():
                user = User.query.filter_by(username=username).first()
                if user:
                    try:
                        db.session.delete(user)
                        db.session.commit()
                        print(f"User '{username}' deleted.")
                    except Exception as e:
                        print(f"Error: {e}")
                else:
                    print(f"User '{username}' not found.")
    else:
        main()
