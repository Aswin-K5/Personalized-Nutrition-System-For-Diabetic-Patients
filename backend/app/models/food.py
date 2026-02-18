from sqlalchemy import Column, Integer, String, Boolean, BigInteger
from app.database import Base


class Food(Base):
    __tablename__ = "foods"

    id = Column(Integer, primary_key=True, index=True)
    food_code = Column(BigInteger, unique=True, index=True, nullable=False)
    main_description = Column(String, nullable=False, index=True)
    additional_description = Column(String, nullable=True)
    wweia_category_number = Column(Integer, nullable=False, index=True)
    wweia_category_description = Column(String, nullable=False)

    # Nutritional flags derived from WWEIA category
    is_anti_inflammatory = Column(Boolean, default=False)
    is_pro_inflammatory = Column(Boolean, default=False)
    is_low_gi = Column(Boolean, default=False)
    is_fruit_vegetable = Column(Boolean, default=False)
    is_high_fiber = Column(Boolean, default=False)
    is_omega3_rich = Column(Boolean, default=False)
    is_ultra_processed = Column(Boolean, default=False)
    is_mufa_rich = Column(Boolean, default=False)

    def __repr__(self):
        return f"<Food {self.food_code}: {self.main_description}>"