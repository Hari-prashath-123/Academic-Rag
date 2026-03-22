from models import get_db
from models.user import User, UserRole
from models.role import Role

db = next(get_db())
staff = db.query(User).filter(User.email == 'staff1@gmail.com').first()
if staff:
    print(f'User: {staff.email}')
    print(f'ID: {staff.id}')
    roles = db.query(UserRole).filter(UserRole.user_id == staff.id).all()
    print(f'Roles assigned:')
    for ur in roles:
        role = db.query(Role).filter(Role.id == ur.role_id).first()
        print(f'  - {role.name if role else "Unknown"}')
else:
    print('Staff1 user not found')
