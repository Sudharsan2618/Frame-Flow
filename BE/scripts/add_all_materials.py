import os

def update_repo():
    repo_file = r"c:\Users\WELCOME\Desktop\Recruit\BE\app\repositories\course_repository.py"
    with open(repo_file, "r", encoding="utf-8") as f:
        content = f.read()

    if "get_all_student_materials" not in content:
        new_method = """
    async def get_all_student_materials(self, student_id: int):
        query = (
            select(Material, Course.title.label("course_title"))
            .select_from(Enrollment)
            .join(Course, Course.course_id == Enrollment.course_id)
            .join(Material, Material.course_id == Course.course_id)
            .where(Enrollment.student_id == student_id)
        )
        result = await self.db.execute(query)
        rows = result.all()
        return rows
"""
        content += new_method
        with open(repo_file, "w", encoding="utf-8") as f:
            f.write(content)

def update_service():
    service_file = r"c:\Users\WELCOME\Desktop\Recruit\BE\app\services\course_service.py"
    with open(service_file, "r", encoding="utf-8") as f:
        content = f.read()

    if "get_all_materials" not in content:
        # Find where to insert it. We can just append it before the Categories section.
        categories_idx = content.find("    # ── Categories ──")
        if categories_idx == -1:
            categories_idx = len(content)
        
        new_method = """
    async def get_all_materials(self, student_id: int) -> List[dict]:
        rows = await self.repo.get_all_student_materials(student_id)
        results = []
        for material, course_title in rows:
            m_dict = MaterialOut.model_validate(material).model_dump()
            m_dict["courseName"] = course_title
            results.append(m_dict)
        return results

"""
        content = content[:categories_idx] + new_method + content[categories_idx:]
        with open(service_file, "w", encoding="utf-8") as f:
            f.write(content)

def update_router():
    router_file = r"c:\Users\WELCOME\Desktop\Recruit\BE\app\api\v1\endpoints\courses.py"
    with open(router_file, "r", encoding="utf-8") as f:
        content = f.read()

    if "get_all_materials_for_student" not in content:
        new_endpoint = """
@student_router.get("/materials/all", response_model=list[dict])
async def get_all_materials_for_student(
    student_id: int = Query(..., description="Student ID"),
    service: CourseService = Depends(get_service),
):
    \"\"\"Get all downloadable materials across all enrolled courses.\"\"\"
    return await service.get_all_materials(student_id)
"""
        
        # Insert before get_enrollments
        insert_idx = content.find("@student_router.get(\"/enrollments\"")
        if insert_idx != -1:
            content = content[:insert_idx] + new_endpoint + "\n" + content[insert_idx:]
            with open(router_file, "w", encoding="utf-8") as f:
                f.write(content)

if __name__ == "__main__":
    update_repo()
    update_service()
    update_router()
    print("Done adding get_all_materials")
