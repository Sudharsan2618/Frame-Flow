import os

def update_backend():
    repo_file = r"c:\Users\WELCOME\Desktop\Recruit\BE\app\repositories\course_repository.py"
    with open(repo_file, "r", encoding="utf-8") as f:
        content = f.read()

    if "get_all_user_materials" not in content:
        new_method_repo = """
    async def get_all_user_materials(self, user_id: int):
        from app.models.user import Student
        query = (
            select(Material, Course.title.label("course_title"))
            .select_from(Student)
            .join(Enrollment, Enrollment.student_id == Student.student_id)
            .join(Course, Course.course_id == Enrollment.course_id)
            .join(Material, Material.course_id == Course.course_id)
            .where(Student.user_id == user_id)
        )
        result = await self.db.execute(query)
        rows = result.all()
        return rows
"""
        content += new_method_repo
        with open(repo_file, "w", encoding="utf-8") as f:
            f.write(content)

    service_file = r"c:\Users\WELCOME\Desktop\Recruit\BE\app\services\course_service.py"
    with open(service_file, "r", encoding="utf-8") as f:
        content = f.read()

    if "get_all_materials_by_user" not in content:
        idx = content.find("    # ── Categories ──")
        if idx == -1: idx = len(content)
        new_method_svc = """
    async def get_all_materials_by_user(self, user_id: int) -> List[dict]:
        rows = await self.repo.get_all_user_materials(user_id)
        results = []
        for material, course_title in rows:
            m_dict = MaterialOut.model_validate(material).model_dump()
            m_dict["courseName"] = course_title
            results.append(m_dict)
        return results

"""
        content = content[:idx] + new_method_svc + content[idx:]
        with open(service_file, "w", encoding="utf-8") as f:
            f.write(content)

    router_file = r"c:\Users\WELCOME\Desktop\Recruit\BE\app\api\v1\endpoints\courses.py"
    with open(router_file, "r", encoding="utf-8") as f:
        content = f.read()

    if "get_current_user_id" not in content:
        lines = content.split('\n')
        lines.insert(8, "from app.api.dependencies import get_current_user_id")
        content = '\n'.join(lines)

    import re
    # Replace the endpoint signature we added earlier
    old_endpoint_pattern = r"""@student_router\.get\("/materials/all", response_model=list\[dict\]\)
async def get_all_materials_for_student\(.*?\)?:
    \"\"\"Get all downloadable materials across all enrolled courses\.\"\"\"
    return await service\.get_all_materials\(student_id\)"""
    
    new_endpoint = """@student_router.get("/materials/all", response_model=list[dict])
async def get_all_materials_for_user(
    user_id: int = Depends(get_current_user_id),
    service: CourseService = Depends(get_service),
):
    \"\"\"Get all downloadable materials across all enrolled courses.\"\"\"
    return await service.get_all_materials_by_user(user_id)"""

    content = re.sub(old_endpoint_pattern, new_endpoint, content, flags=re.DOTALL)
    
    with open(router_file, "w", encoding="utf-8") as f:
        f.write(content)

if __name__ == "__main__":
    update_backend()
    print("Done")
